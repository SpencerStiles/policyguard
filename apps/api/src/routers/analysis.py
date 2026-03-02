"""Analysis endpoints — run gap/conflict/recommendation analysis."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.auth import get_current_user
from src.db.database import get_db
from src.models.models import Analysis, Client
from src.schemas import (
    AnalysisCreate,
    AnalysisListOut,
    AnalysisOut,
    CoverageTypeInfo,
    GapPatternInfo,
    IndustryProfileInfo,
)
from src.services.analysis import run_full_analysis

logger = logging.getLogger("policyguard.analysis_router")

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# ---------------------------------------------------------------------------
# Domain data endpoint (serves insurance domain knowledge to the frontend)
# Public — read-only reference data, no auth required.
# ---------------------------------------------------------------------------

def _get_domain_data() -> dict:
    """Load domain knowledge. In production this could come from a database
    or configurable domain packages. For now we import the insurance package."""
    try:
        # This data is also available as a JSON export for the Python backend
        # We'll serve a simplified version
        return {
            "coverageTypes": _load_coverage_types(),
            "gapPatterns": _load_gap_patterns(),
            "conflictPatterns": _load_conflict_patterns(),
            "industryProfiles": _load_industry_profiles(),
        }
    except Exception as exc:
        logger.warning("Failed to load domain data: %s", exc)
        return {"coverageTypes": [], "gapPatterns": [], "conflictPatterns": [], "industryProfiles": []}


def _load_coverage_types() -> list[dict]:
    return [
        {"id": "cgl", "name": "Commercial General Liability (CGL)", "category": "liability", "description": "Third-party bodily injury, property damage, personal injury coverage.", "common_limits": {"min": 500000, "typical": 1000000, "recommended": 2000000}},
        {"id": "commercial-property", "name": "Commercial Property", "category": "property", "description": "Direct physical loss or damage to buildings and business property.", "common_limits": {"min": 250000, "typical": 1000000, "recommended": 5000000}},
        {"id": "bop", "name": "Business Owners Policy (BOP)", "category": "package", "description": "Bundled property and general liability for small-to-medium businesses.", "common_limits": {"min": 300000, "typical": 1000000, "recommended": 2000000}},
        {"id": "professional-liability", "name": "Professional Liability / E&O", "category": "liability", "description": "Coverage for negligent acts, errors, or omissions in professional services.", "common_limits": {"min": 250000, "typical": 1000000, "recommended": 5000000}},
        {"id": "directors-officers", "name": "Directors & Officers (D&O)", "category": "management-liability", "description": "Protects personal assets of directors and officers from lawsuits.", "common_limits": {"min": 1000000, "typical": 5000000, "recommended": 10000000}},
        {"id": "epli", "name": "Employment Practices Liability (EPLI)", "category": "management-liability", "description": "Covers employment-related claims: discrimination, harassment, wrongful termination.", "common_limits": {"min": 250000, "typical": 1000000, "recommended": 3000000}},
        {"id": "cyber-liability", "name": "Cyber Liability", "category": "specialty", "description": "Data breach, network security, cyber extortion, and regulatory coverage.", "common_limits": {"min": 500000, "typical": 2000000, "recommended": 5000000}},
        {"id": "workers-compensation", "name": "Workers Compensation", "category": "statutory", "description": "Statutory coverage for work-related injuries and illnesses.", "common_limits": {"min": 100000, "typical": 500000, "recommended": 1000000}},
        {"id": "commercial-auto", "name": "Commercial Auto", "category": "liability", "description": "Liability and physical damage for business-owned and used vehicles.", "common_limits": {"min": 500000, "typical": 1000000, "recommended": 2000000}},
        {"id": "umbrella-excess", "name": "Umbrella / Excess Liability", "category": "liability", "description": "Additional liability limits above underlying policies.", "common_limits": {"min": 1000000, "typical": 5000000, "recommended": 10000000}},
        {"id": "business-interruption", "name": "Business Interruption", "category": "property", "description": "Loss of income and extra expense from covered property damage.", "common_limits": {"min": 100000, "typical": 500000, "recommended": 2000000}},
        {"id": "product-liability", "name": "Product Liability", "category": "liability", "description": "Claims from bodily injury or property damage caused by products.", "common_limits": {"min": 500000, "typical": 2000000, "recommended": 5000000}},
    ]


def _load_gap_patterns() -> list[dict]:
    return [
        {"id": "no-cyber-liability", "name": "Missing Cyber Liability Coverage", "severity": "critical", "description": "No standalone cyber liability policy or cyber endorsement."},
        {"id": "inadequate-umbrella-limits", "name": "Umbrella/Excess Limits Below Standard", "severity": "high", "description": "Umbrella limits below industry threshold."},
        {"id": "no-epli", "name": "Missing Employment Practices Liability", "severity": "high", "description": "Employees but no EPLI coverage."},
        {"id": "no-professional-liability", "name": "Missing Professional Liability / E&O", "severity": "critical", "description": "Professional services without E&O coverage."},
        {"id": "property-underinsurance", "name": "Property Coverage Below Replacement Cost", "severity": "high", "description": "Declared values below current replacement cost."},
        {"id": "no-business-interruption", "name": "Missing Business Interruption Coverage", "severity": "high", "description": "No business income coverage for operational disruption."},
        {"id": "no-directors-officers", "name": "Missing D&O Coverage", "severity": "high", "description": "Board of directors without D&O protection."},
        {"id": "workers-comp-gap", "name": "Workers Comp Non-Compliance", "severity": "critical", "description": "Missing or incomplete workers compensation coverage."},
        {"id": "auto-hired-nonowned-gap", "name": "Missing Hired & Non-Owned Auto", "severity": "medium", "description": "No coverage for personal vehicles used for business."},
        {"id": "claims-made-gap-coverage", "name": "Claims-Made Without Tail Coverage", "severity": "high", "description": "Claims-made policy replaced without tail endorsement."},
    ]


def _load_conflict_patterns() -> list[dict]:
    return [
        {"id": "cgl-professional-liability-overlap", "name": "CGL vs. Professional Liability Overlap", "severity": "high", "description": "Both policies may respond to professional services claims."},
        {"id": "umbrella-underlying-schedule-mismatch", "name": "Umbrella Schedule Mismatch", "severity": "critical", "description": "Umbrella schedule does not match underlying policies."},
        {"id": "cyber-cgl-data-breach", "name": "Cyber vs. CGL Data Breach Conflict", "severity": "high", "description": "Both policies may cover data breach claims."},
        {"id": "bop-standalone-conflict", "name": "BOP vs. Standalone Duplication", "severity": "medium", "description": "Duplicate coverage between BOP and standalone policies."},
    ]


def _load_industry_profiles() -> list[dict]:
    return [
        {"id": "technology-saas", "name": "Technology / SaaS", "description": "Software and cloud service providers.", "typical_coverages": ["professional-liability", "cyber-liability", "cgl", "directors-officers", "epli"], "risk_factors": ["Data breach", "Technology E&O", "IP infringement"]},
        {"id": "professional-services", "name": "Professional Services", "description": "Consulting, accounting, and advisory firms.", "typical_coverages": ["professional-liability", "cgl", "bop", "epli", "cyber-liability"], "risk_factors": ["Professional negligence", "Breach of contract", "Client data exposure"]},
        {"id": "healthcare-provider", "name": "Healthcare Provider", "description": "Hospitals, clinics, and medical practices.", "typical_coverages": ["professional-liability", "cgl", "cyber-liability", "epli", "workers-compensation"], "risk_factors": ["Medical malpractice", "HIPAA violations", "Ransomware"]},
        {"id": "construction-general", "name": "Construction", "description": "General contractors and specialty subs.", "typical_coverages": ["cgl", "commercial-auto", "workers-compensation", "umbrella-excess"], "risk_factors": ["Bodily injury", "Property damage", "Subcontractor default"]},
        {"id": "manufacturing", "name": "Manufacturing", "description": "Product manufacturers and assemblers.", "typical_coverages": ["cgl", "product-liability", "commercial-property", "business-interruption", "workers-compensation"], "risk_factors": ["Product liability", "Supply chain disruption", "Equipment breakdown"]},
        {"id": "retail-ecommerce", "name": "Retail / E-Commerce", "description": "Physical and online retail.", "typical_coverages": ["cgl", "commercial-property", "product-liability", "cyber-liability", "business-interruption"], "risk_factors": ["Premises liability", "Product liability", "PCI compliance"]},
        {"id": "financial-services", "name": "Financial Services", "description": "Banks, insurance agencies, fintech.", "typical_coverages": ["professional-liability", "directors-officers", "cyber-liability", "epli"], "risk_factors": ["Professional negligence", "Regulatory enforcement", "Wire fraud"]},
        {"id": "hospitality", "name": "Hospitality", "description": "Hotels, restaurants, and entertainment.", "typical_coverages": ["cgl", "commercial-property", "business-interruption", "workers-compensation", "epli"], "risk_factors": ["Premises liability", "Liquor liability", "Food contamination"]},
        {"id": "nonprofit", "name": "Nonprofit", "description": "Charitable organizations and associations.", "typical_coverages": ["directors-officers", "cgl", "epli", "professional-liability"], "risk_factors": ["Board liability", "Volunteer injury", "Fundraising compliance"]},
    ]


@router.get("/domain/coverage-types", response_model=list[CoverageTypeInfo])
async def get_coverage_types():
    """Get all known coverage types."""
    return _load_coverage_types()


@router.get("/domain/gap-patterns", response_model=list[GapPatternInfo])
async def get_gap_patterns():
    """Get all known gap patterns."""
    return _load_gap_patterns()


@router.get("/domain/industry-profiles", response_model=list[IndustryProfileInfo])
async def get_industry_profiles():
    """Get all industry profiles."""
    return _load_industry_profiles()


# ---------------------------------------------------------------------------
# Analysis CRUD — all protected with get_current_user
# ---------------------------------------------------------------------------

@router.get("/client/{client_id}", response_model=list[AnalysisListOut])
async def list_analyses(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """List all analyses for a client."""
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.gaps), selectinload(Analysis.conflicts))
        .where(Analysis.client_id == client_id)
        .order_by(Analysis.created_at.desc())
    )
    result = await db.execute(stmt)
    analyses = result.scalars().all()

    return [
        AnalysisListOut(
            id=a.id,
            client_id=a.client_id,
            title=a.title,
            status=a.status,
            overall_score=a.overall_score,
            gap_count=len(a.gaps),
            conflict_count=len(a.conflicts),
            created_at=a.created_at,
            completed_at=a.completed_at,
        )
        for a in analyses
    ]


@router.post("", response_model=AnalysisOut, status_code=201)
async def create_analysis(
    data: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """Create and run a new analysis for a client."""
    # Verify client exists
    client = await db.get(Client, data.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    analysis = Analysis(
        client_id=data.client_id,
        title=data.title,
        industry_profile_id=data.industry_profile_id,
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    # Run analysis in background
    domain_data = _get_domain_data()
    background_tasks.add_task(_run_analysis_background, analysis.id, domain_data)

    return AnalysisOut(
        id=analysis.id,
        client_id=analysis.client_id,
        title=analysis.title,
        status=analysis.status,
        industry_profile_id=analysis.industry_profile_id,
        created_at=analysis.created_at,
    )


async def _run_analysis_background(analysis_id: str, domain_data: dict) -> None:
    """Background task wrapper."""
    from src.db.database import async_session

    async with async_session() as db:
        try:
            await run_full_analysis(db, analysis_id, domain_data)
            await db.commit()
        except Exception:
            logger.exception("Background analysis failed for %s", analysis_id)
            await db.rollback()


@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """Get a full analysis with all findings."""
    stmt = (
        select(Analysis)
        .options(
            selectinload(Analysis.gaps),
            selectinload(Analysis.conflicts),
            selectinload(Analysis.recommendations),
        )
        .where(Analysis.id == analysis_id)
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """Delete an analysis."""
    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.delete(analysis)

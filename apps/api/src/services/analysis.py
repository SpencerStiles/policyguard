"""Core analysis service — orchestrates coverage extraction, gap detection, and conflict detection.

This module ties together the PDF parser, vector store, LLM service, and
domain knowledge to produce a full policy program analysis.
"""

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import (
    Analysis,
    ConflictFinding,
    ExtractedCoverage,
    GapFinding,
    Policy,
    Recommendation,
)
from src.services import embeddings, llm, vectorstore
from src.services.pdf_parser import ParsedDocument, chunk_document, parse_pdf

logger = logging.getLogger("policyguard.analysis")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

COVERAGE_EXTRACTION_PROMPT = """Analyze the following insurance policy text and extract all coverage information.

For each coverage found, extract:
- coverage_type_id: A machine-readable ID (e.g., "cgl", "cyber-liability", "workers-compensation")
- coverage_name: The full name of the coverage
- limit_per_occurrence: Per-occurrence limit in USD (null if not found)
- limit_aggregate: Aggregate limit in USD (null if not found)  
- deductible: Deductible amount in USD (null if not found)
- retention: Self-insured retention in USD (null if not found)
- premium: Premium amount in USD (null if not found)
- form_number: Policy form number (e.g., "CG 00 01")
- endorsements: List of endorsement names/numbers
- exclusions: List of notable exclusions
- conditions: List of notable conditions or sub-limits
- confidence_score: Your confidence in this extraction (0-1)
- source_pages: Page numbers where this coverage was found
- raw_excerpt: The exact text excerpt supporting this extraction"""

COVERAGE_EXTRACTION_SCHEMA = """{
  "policy_info": {
    "carrier": "string or null",
    "policy_number": "string or null", 
    "effective_date": "YYYY-MM-DD or null",
    "expiration_date": "YYYY-MM-DD or null",
    "named_insured": "string or null"
  },
  "coverages": [
    {
      "coverage_type_id": "string",
      "coverage_name": "string",
      "limit_per_occurrence": "number or null",
      "limit_aggregate": "number or null",
      "deductible": "number or null",
      "retention": "number or null",
      "premium": "number or null",
      "form_number": "string or null",
      "endorsements": ["string"],
      "exclusions": ["string"],
      "conditions": ["string"],
      "confidence_score": "number 0-1",
      "source_pages": "string",
      "raw_excerpt": "string"
    }
  ]
}"""

GAP_ANALYSIS_PROMPT = """You are an expert insurance coverage analyst. Analyze the client's current coverage program and identify gaps.

You have access to:
1. The client's extracted coverages (from their policies)
2. The industry profile for their business type
3. Known gap patterns from domain knowledge

For each gap identified, provide:
- gap_pattern_id: ID matching a known gap pattern (or "custom" for novel gaps)
- title: Short descriptive title
- severity: "critical", "high", "medium", or "low"
- description: Detailed explanation of the gap and its potential impact
- affected_coverage_types: List of coverage type IDs affected
- recommended_action: Specific remediation steps
- confidence_score: Your confidence in this finding (0-1)
- evidence: Specific policy text or data points supporting this finding"""

GAP_ANALYSIS_SCHEMA = """{
  "gaps": [
    {
      "gap_pattern_id": "string",
      "title": "string",
      "severity": "critical|high|medium|low",
      "description": "string",
      "affected_coverage_types": ["string"],
      "recommended_action": "string",
      "confidence_score": "number 0-1",
      "evidence": "string"
    }
  ],
  "summary": "string"
}"""

CONFLICT_ANALYSIS_PROMPT = """You are an expert insurance coverage analyst. Analyze the client's policies for conflicts, overlaps, and coordination issues.

Look for:
- Overlapping coverage between policies
- Contradictory terms or conditions
- Scheduling mismatches (e.g., umbrella schedule vs. underlying policies)
- Inconsistent additional insured status
- Valuation method inconsistencies
- Other insurance clause conflicts

For each conflict identified, provide:
- conflict_pattern_id: ID matching a known conflict pattern (or "custom")
- title: Short descriptive title
- severity: "critical", "high", or "medium"
- description: Detailed explanation
- policies_involved: List of policy IDs or descriptions involved
- conflict_type: "overlap", "contradiction", "coordination", or "exclusion-gap"
- resolution: Recommended resolution steps
- confidence_score: Your confidence (0-1)
- evidence: Supporting text from the policies"""

CONFLICT_ANALYSIS_SCHEMA = """{
  "conflicts": [
    {
      "conflict_pattern_id": "string",
      "title": "string",
      "severity": "critical|high|medium",
      "description": "string",
      "policies_involved": ["string"],
      "conflict_type": "string",
      "resolution": "string",
      "confidence_score": "number 0-1",
      "evidence": "string"
    }
  ],
  "summary": "string"
}"""

RECOMMENDATION_PROMPT = """Based on the coverage analysis, gap findings, and conflict findings, generate prioritized recommendations for the client.

Categories: "coverage_addition", "limit_increase", "policy_restructure", "endorsement", "carrier_change", "risk_management", "compliance"

For each recommendation:
- title: Clear action-oriented title
- priority: "critical", "high", "medium", or "low"
- category: One of the categories above
- description: Detailed recommendation with reasoning
- estimated_impact: Expected benefit (qualitative)
- confidence_score: Your confidence (0-1)"""

RECOMMENDATION_SCHEMA = """{
  "recommendations": [
    {
      "title": "string",
      "priority": "critical|high|medium|low",
      "category": "string",
      "description": "string",
      "estimated_impact": "string",
      "confidence_score": "number 0-1"
    }
  ],
  "overall_score": "number 0-100",
  "executive_summary": "string"
}"""


# ---------------------------------------------------------------------------
# Service Functions
# ---------------------------------------------------------------------------

async def process_uploaded_policy(
    db: AsyncSession,
    policy_id: str,
) -> None:
    """Parse an uploaded PDF, extract text, embed chunks, and extract coverages.

    This is the main pipeline that runs after a policy is uploaded:
    1. Parse PDF to text
    2. Chunk the text
    3. Generate embeddings
    4. Store in vector DB
    5. Extract structured coverage data via LLM
    6. Save extracted coverages to the database
    """
    policy = await db.get(Policy, policy_id)
    if not policy:
        logger.error("Policy %s not found", policy_id)
        return

    try:
        policy.status = "parsing"
        await db.commit()

        # 1. Parse PDF
        parsed = parse_pdf(policy.file_path)
        policy.page_count = parsed.page_count

        # 2. Chunk
        chunks = chunk_document(parsed)

        if not chunks:
            logger.warning("No text chunks extracted from policy %s", policy_id)
            policy.status = "parsed"
            await db.commit()
            return

        # 3. Generate embeddings
        texts = [c["text"] for c in chunks]
        embedding_vectors = await embeddings.get_embeddings(texts)

        # 4. Store in vector DB
        collection_name = f"client_{policy.client_id}"
        await vectorstore.add_chunks(collection_name, chunks, embedding_vectors, policy_id)

        # 5. Extract structured coverage data
        extraction_result = await llm.extract_structured_data(
            text=parsed.full_text[:15000],  # Limit context to avoid token limits
            extraction_prompt=COVERAGE_EXTRACTION_PROMPT,
            schema_description=COVERAGE_EXTRACTION_SCHEMA,
        )

        # 6. Save to database
        if isinstance(extraction_result, dict):
            # Update policy metadata
            policy_info = extraction_result.get("policy_info", {})
            if policy_info:
                policy.carrier = policy_info.get("carrier")
                policy.policy_number = policy_info.get("policy_number")
                policy.effective_date = policy_info.get("effective_date")
                policy.expiration_date = policy_info.get("expiration_date")

            # Save extracted coverages
            coverages_data = extraction_result.get("coverages", [])
            for cov in coverages_data:
                extracted = ExtractedCoverage(
                    policy_id=policy_id,
                    coverage_type_id=cov.get("coverage_type_id", "unknown"),
                    coverage_name=cov.get("coverage_name", "Unknown Coverage"),
                    limit_per_occurrence=cov.get("limit_per_occurrence"),
                    limit_aggregate=cov.get("limit_aggregate"),
                    deductible=cov.get("deductible"),
                    retention=cov.get("retention"),
                    premium=cov.get("premium"),
                    form_number=cov.get("form_number"),
                    endorsements=json.dumps(cov.get("endorsements", [])),
                    exclusions=json.dumps(cov.get("exclusions", [])),
                    conditions=json.dumps(cov.get("conditions", [])),
                    confidence_score=cov.get("confidence_score", 0.0),
                    source_pages=cov.get("source_pages"),
                    raw_excerpt=cov.get("raw_excerpt"),
                )
                db.add(extracted)

            # Infer coverage type from first extraction
            if coverages_data:
                policy.coverage_type = coverages_data[0].get("coverage_type_id")

        policy.status = "parsed"
        await db.commit()
        logger.info("Successfully processed policy %s", policy_id)

    except Exception as exc:
        logger.exception("Failed to process policy %s: %s", policy_id, exc)
        policy.status = "error"
        await db.commit()


async def run_gap_analysis(
    db: AsyncSession,
    analysis: Analysis,
    extracted_coverages: list[dict],
    industry_profile: dict | None,
    gap_patterns: list[dict],
) -> list[GapFinding]:
    """Run gap analysis using LLM with domain knowledge context."""
    context = f"""Client's current coverages:
{json.dumps(extracted_coverages, indent=2)}

Industry profile:
{json.dumps(industry_profile, indent=2) if industry_profile else "Not specified"}

Known gap patterns to check against:
{json.dumps(gap_patterns, indent=2)}"""

    result = await llm.extract_structured_data(
        text=context,
        extraction_prompt=GAP_ANALYSIS_PROMPT,
        schema_description=GAP_ANALYSIS_SCHEMA,
    )

    findings: list[GapFinding] = []
    if isinstance(result, dict):
        for gap in result.get("gaps", []):
            finding = GapFinding(
                analysis_id=analysis.id,
                gap_pattern_id=gap.get("gap_pattern_id"),
                title=gap.get("title", "Unknown Gap"),
                severity=gap.get("severity", "medium"),
                description=gap.get("description", ""),
                affected_coverage_types=json.dumps(gap.get("affected_coverage_types", [])),
                recommended_action=gap.get("recommended_action"),
                confidence_score=gap.get("confidence_score", 0.0),
                evidence=gap.get("evidence"),
            )
            db.add(finding)
            findings.append(finding)

    return findings


async def run_conflict_analysis(
    db: AsyncSession,
    analysis: Analysis,
    extracted_coverages: list[dict],
    conflict_patterns: list[dict],
) -> list[ConflictFinding]:
    """Run conflict detection using LLM with domain knowledge context."""
    context = f"""Client's current coverages across all policies:
{json.dumps(extracted_coverages, indent=2)}

Known conflict patterns to check against:
{json.dumps(conflict_patterns, indent=2)}"""

    result = await llm.extract_structured_data(
        text=context,
        extraction_prompt=CONFLICT_ANALYSIS_PROMPT,
        schema_description=CONFLICT_ANALYSIS_SCHEMA,
    )

    findings: list[ConflictFinding] = []
    if isinstance(result, dict):
        for conflict in result.get("conflicts", []):
            finding = ConflictFinding(
                analysis_id=analysis.id,
                conflict_pattern_id=conflict.get("conflict_pattern_id"),
                title=conflict.get("title", "Unknown Conflict"),
                severity=conflict.get("severity", "medium"),
                description=conflict.get("description", ""),
                policies_involved=json.dumps(conflict.get("policies_involved", [])),
                conflict_type=conflict.get("conflict_type"),
                resolution=conflict.get("resolution"),
                confidence_score=conflict.get("confidence_score", 0.0),
                evidence=conflict.get("evidence"),
            )
            db.add(finding)
            findings.append(finding)

    return findings


async def run_recommendations(
    db: AsyncSession,
    analysis: Analysis,
    gaps: list[dict],
    conflicts: list[dict],
    coverages: list[dict],
) -> tuple[list[Recommendation], float | None, str | None]:
    """Generate recommendations based on gap and conflict findings.

    Returns:
        Tuple of (recommendations, overall_score, executive_summary).
    """
    context = f"""Gap findings:
{json.dumps(gaps, indent=2)}

Conflict findings:
{json.dumps(conflicts, indent=2)}

Current coverages:
{json.dumps(coverages, indent=2)}"""

    result = await llm.extract_structured_data(
        text=context,
        extraction_prompt=RECOMMENDATION_PROMPT,
        schema_description=RECOMMENDATION_SCHEMA,
    )

    recs: list[Recommendation] = []
    overall_score = None
    summary = None

    if isinstance(result, dict):
        overall_score = result.get("overall_score")
        summary = result.get("executive_summary")

        for rec in result.get("recommendations", []):
            recommendation = Recommendation(
                analysis_id=analysis.id,
                title=rec.get("title", ""),
                priority=rec.get("priority", "medium"),
                category=rec.get("category", "general"),
                description=rec.get("description", ""),
                estimated_impact=rec.get("estimated_impact"),
                confidence_score=rec.get("confidence_score", 0.0),
            )
            db.add(recommendation)
            recs.append(recommendation)

    return recs, overall_score, summary


async def run_full_analysis(
    db: AsyncSession,
    analysis_id: str,
    domain_data: dict,
) -> None:
    """Execute the full analysis pipeline for a client's policy program.

    Steps:
    1. Gather all extracted coverages for the client
    2. Run gap analysis
    3. Run conflict analysis
    4. Generate recommendations
    5. Update analysis record with results
    """
    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        logger.error("Analysis %s not found", analysis_id)
        return

    try:
        analysis.status = "running"
        await db.commit()

        # Gather all extracted coverages for this client
        stmt = (
            select(ExtractedCoverage)
            .join(Policy)
            .where(Policy.client_id == analysis.client_id)
        )
        result = await db.execute(stmt)
        extracted = result.scalars().all()

        coverages_data = [
            {
                "coverage_type_id": e.coverage_type_id,
                "coverage_name": e.coverage_name,
                "limit_per_occurrence": e.limit_per_occurrence,
                "limit_aggregate": e.limit_aggregate,
                "deductible": e.deductible,
                "confidence_score": e.confidence_score,
                "policy_id": e.policy_id,
            }
            for e in extracted
        ]

        # Get industry profile
        industry_profile = None
        if analysis.industry_profile_id and domain_data.get("industryProfiles"):
            for profile in domain_data["industryProfiles"]:
                if profile["id"] == analysis.industry_profile_id:
                    industry_profile = profile
                    break

        gap_patterns = domain_data.get("gapPatterns", [])
        conflict_patterns = domain_data.get("conflictPatterns", [])

        # Run analyses
        gap_findings = await run_gap_analysis(
            db, analysis, coverages_data, industry_profile, gap_patterns
        )

        conflict_findings = await run_conflict_analysis(
            db, analysis, coverages_data, conflict_patterns
        )

        # Prepare data for recommendations
        gaps_data = [
            {"title": g.title, "severity": g.severity, "description": g.description}
            for g in gap_findings
        ]
        conflicts_data = [
            {"title": c.title, "severity": c.severity, "description": c.description}
            for c in conflict_findings
        ]

        recs, overall_score, summary = await run_recommendations(
            db, analysis, gaps_data, conflicts_data, coverages_data
        )

        # Update analysis
        analysis.status = "completed"
        analysis.overall_score = overall_score
        analysis.summary = summary
        analysis.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(
            "Analysis %s completed: %d gaps, %d conflicts, %d recommendations",
            analysis_id,
            len(gap_findings),
            len(conflict_findings),
            len(recs),
        )

    except Exception as exc:
        logger.exception("Analysis %s failed: %s", analysis_id, exc)
        analysis.status = "error"
        await db.commit()

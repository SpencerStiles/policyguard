"""Report generation endpoints."""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.auth import get_current_user
from src.db.database import get_db
from src.models.models import Analysis

logger = logging.getLogger("policyguard.reports")

router = APIRouter(
    prefix="/api/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/{analysis_id}")
async def generate_report(
    analysis_id: str,
    format: str = "json",
    db: AsyncSession = Depends(get_db),
):
    """Generate a report for a completed analysis.

    Supports format=json (default) and format=markdown.
    """
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

    if analysis.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Analysis is '{analysis.status}', not 'completed'",
        )

    if format == "markdown":
        return {"content": _generate_markdown_report(analysis), "format": "markdown"}

    return _generate_json_report(analysis)


def _generate_json_report(analysis: Analysis) -> dict:
    """Generate a structured JSON report."""
    return {
        "report": {
            "id": analysis.id,
            "title": analysis.title,
            "generated_at": datetime.utcnow().isoformat(),
            "overall_score": analysis.overall_score,
            "executive_summary": analysis.summary,
            "gaps": [
                {
                    "title": g.title,
                    "severity": g.severity,
                    "description": g.description,
                    "recommended_action": g.recommended_action,
                    "confidence": g.confidence_score,
                }
                for g in sorted(analysis.gaps, key=lambda x: _severity_order(x.severity))
            ],
            "conflicts": [
                {
                    "title": c.title,
                    "severity": c.severity,
                    "description": c.description,
                    "resolution": c.resolution,
                    "confidence": c.confidence_score,
                }
                for c in sorted(analysis.conflicts, key=lambda x: _severity_order(x.severity))
            ],
            "recommendations": [
                {
                    "title": r.title,
                    "priority": r.priority,
                    "category": r.category,
                    "description": r.description,
                    "estimated_impact": r.estimated_impact,
                    "confidence": r.confidence_score,
                }
                for r in sorted(analysis.recommendations, key=lambda x: _severity_order(x.priority))
            ],
            "statistics": {
                "total_gaps": len(analysis.gaps),
                "critical_gaps": len([g for g in analysis.gaps if g.severity == "critical"]),
                "high_gaps": len([g for g in analysis.gaps if g.severity == "high"]),
                "total_conflicts": len(analysis.conflicts),
                "total_recommendations": len(analysis.recommendations),
            },
        }
    }


def _generate_markdown_report(analysis: Analysis) -> str:
    """Generate a Markdown-formatted report."""
    lines = [
        f"# PolicyGuard Analysis Report",
        f"## {analysis.title}",
        f"",
        f"**Generated:** {datetime.utcnow().strftime('%B %d, %Y')}",
        f"**Overall Score:** {analysis.overall_score}/100" if analysis.overall_score else "",
        f"",
    ]

    if analysis.summary:
        lines.extend([
            "## Executive Summary",
            "",
            analysis.summary,
            "",
        ])

    # Gaps
    if analysis.gaps:
        lines.extend([
            "## Coverage Gaps",
            "",
            f"Found **{len(analysis.gaps)}** coverage gaps:",
            "",
        ])
        for g in sorted(analysis.gaps, key=lambda x: _severity_order(x.severity)):
            severity_emoji = {"critical": "!!!", "high": "!!", "medium": "!", "low": ""}.get(g.severity, "")
            lines.extend([
                f"### [{g.severity.upper()}] {g.title}",
                "",
                g.description,
                "",
                f"**Recommended Action:** {g.recommended_action}" if g.recommended_action else "",
                f"**Confidence:** {g.confidence_score:.0%}",
                "",
            ])

    # Conflicts
    if analysis.conflicts:
        lines.extend([
            "## Policy Conflicts",
            "",
            f"Found **{len(analysis.conflicts)}** conflicts:",
            "",
        ])
        for c in sorted(analysis.conflicts, key=lambda x: _severity_order(x.severity)):
            lines.extend([
                f"### [{c.severity.upper()}] {c.title}",
                "",
                c.description,
                "",
                f"**Resolution:** {c.resolution}" if c.resolution else "",
                f"**Confidence:** {c.confidence_score:.0%}",
                "",
            ])

    # Recommendations
    if analysis.recommendations:
        lines.extend([
            "## Recommendations",
            "",
        ])
        for r in sorted(analysis.recommendations, key=lambda x: _severity_order(x.priority)):
            lines.extend([
                f"### [{r.priority.upper()}] {r.title}",
                "",
                r.description,
                "",
                f"**Category:** {r.category}",
                f"**Estimated Impact:** {r.estimated_impact}" if r.estimated_impact else "",
                "",
            ])

    return "\n".join(lines)


def _severity_order(severity: str) -> int:
    """Sort severity/priority with critical first."""
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return order.get(severity, 4)

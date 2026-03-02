"""Pydantic schemas for API request/response validation."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: str | None = None
    description: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    description: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class ClientOut(BaseModel):
    id: str
    name: str
    industry: str | None = None
    description: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientListOut(BaseModel):
    id: str
    name: str
    industry: str | None = None
    policy_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Policy
# ---------------------------------------------------------------------------

class PolicyOut(BaseModel):
    id: str
    client_id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    page_count: int | None = None
    status: str
    coverage_type: str | None = None
    carrier: str | None = None
    policy_number: str | None = None
    effective_date: str | None = None
    expiration_date: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Extracted Coverage
# ---------------------------------------------------------------------------

class ExtractedCoverageOut(BaseModel):
    id: str
    policy_id: str
    coverage_type_id: str
    coverage_name: str
    limit_per_occurrence: float | None = None
    limit_aggregate: float | None = None
    deductible: float | None = None
    retention: float | None = None
    premium: float | None = None
    form_number: str | None = None
    endorsements: str | None = None
    exclusions: str | None = None
    conditions: str | None = None
    confidence_score: float
    source_pages: str | None = None
    raw_excerpt: str | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

class AnalysisCreate(BaseModel):
    client_id: str
    title: str = Field(..., min_length=1, max_length=500)
    industry_profile_id: str | None = None


class GapFindingOut(BaseModel):
    id: str
    gap_pattern_id: str | None = None
    title: str
    severity: str
    description: str
    affected_coverage_types: str
    recommended_action: str | None = None
    confidence_score: float
    evidence: str | None = None

    model_config = {"from_attributes": True}


class ConflictFindingOut(BaseModel):
    id: str
    conflict_pattern_id: str | None = None
    title: str
    severity: str
    description: str
    policies_involved: str
    conflict_type: str | None = None
    resolution: str | None = None
    confidence_score: float
    evidence: str | None = None

    model_config = {"from_attributes": True}


class RecommendationOut(BaseModel):
    id: str
    title: str
    priority: str
    category: str
    description: str
    estimated_impact: str | None = None
    confidence_score: float

    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    id: str
    client_id: str
    title: str
    status: str
    industry_profile_id: str | None = None
    summary: str | None = None
    overall_score: float | None = None
    created_at: datetime
    completed_at: datetime | None = None
    gaps: list[GapFindingOut] = []
    conflicts: list[ConflictFindingOut] = []
    recommendations: list[RecommendationOut] = []

    model_config = {"from_attributes": True}


class AnalysisListOut(BaseModel):
    id: str
    client_id: str
    title: str
    status: str
    overall_score: float | None = None
    gap_count: int = 0
    conflict_count: int = 0
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    analysis_id: str
    format: str = "json"  # json | pdf | markdown


# ---------------------------------------------------------------------------
# Domain Info
# ---------------------------------------------------------------------------

class CoverageTypeInfo(BaseModel):
    id: str
    name: str
    category: str
    description: str
    common_limits: dict


class GapPatternInfo(BaseModel):
    id: str
    name: str
    severity: str
    description: str


class IndustryProfileInfo(BaseModel):
    id: str
    name: str
    description: str
    typical_coverages: list[str]
    risk_factors: list[str]

/**
 * API client for the PolicyGuard backend.
 *
 * All endpoints are proxied through Next.js rewrites to avoid CORS.
 */

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListItem {
  id: string;
  name: string;
  industry: string | null;
  policy_count: number;
  created_at: string;
}

export function listClients() {
  return request<ClientListItem[]>('/clients');
}

export function getClient(id: string) {
  return request<Client>(`/clients/${id}`);
}

export function createClient(data: { name: string; industry?: string; description?: string; contact_email?: string; contact_phone?: string }) {
  return request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) });
}

export function updateClient(id: string, data: Partial<Client>) {
  return request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteClient(id: string) {
  return request<void>(`/clients/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export interface Policy {
  id: string;
  client_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  page_count: number | null;
  status: string;
  coverage_type: string | null;
  carrier: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedCoverage {
  id: string;
  policy_id: string;
  coverage_type_id: string;
  coverage_name: string;
  limit_per_occurrence: number | null;
  limit_aggregate: number | null;
  deductible: number | null;
  retention: number | null;
  premium: number | null;
  form_number: string | null;
  endorsements: string | null;
  exclusions: string | null;
  conditions: string | null;
  confidence_score: number;
  source_pages: string | null;
  raw_excerpt: string | null;
}

export function listPolicies(clientId: string) {
  return request<Policy[]>(`/policies/client/${clientId}`);
}

export function getPolicy(id: string) {
  return request<Policy>(`/policies/${id}`);
}

export function getPolicyCoverages(policyId: string) {
  return request<ExtractedCoverage[]>(`/policies/${policyId}/coverages`);
}

export function deletePolicy(id: string) {
  return request<void>(`/policies/${id}`, { method: 'DELETE' });
}

export async function uploadPolicy(clientId: string, file: File): Promise<Policy> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE}/upload/${clientId}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface GapFinding {
  id: string;
  gap_pattern_id: string | null;
  title: string;
  severity: string;
  description: string;
  affected_coverage_types: string;
  recommended_action: string | null;
  confidence_score: number;
  evidence: string | null;
}

export interface ConflictFinding {
  id: string;
  conflict_pattern_id: string | null;
  title: string;
  severity: string;
  description: string;
  policies_involved: string;
  conflict_type: string | null;
  resolution: string | null;
  confidence_score: number;
  evidence: string | null;
}

export interface Recommendation {
  id: string;
  title: string;
  priority: string;
  category: string;
  description: string;
  estimated_impact: string | null;
  confidence_score: number;
}

export interface Analysis {
  id: string;
  client_id: string;
  title: string;
  status: string;
  industry_profile_id: string | null;
  summary: string | null;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  gaps: GapFinding[];
  conflicts: ConflictFinding[];
  recommendations: Recommendation[];
}

export interface AnalysisListItem {
  id: string;
  client_id: string;
  title: string;
  status: string;
  overall_score: number | null;
  gap_count: number;
  conflict_count: number;
  created_at: string;
  completed_at: string | null;
}

export function listAnalyses(clientId: string) {
  return request<AnalysisListItem[]>(`/analysis/client/${clientId}`);
}

export function getAnalysis(id: string) {
  return request<Analysis>(`/analysis/${id}`);
}

export function createAnalysis(data: { client_id: string; title: string; industry_profile_id?: string }) {
  return request<Analysis>('/analysis', { method: 'POST', body: JSON.stringify(data) });
}

export function deleteAnalysis(id: string) {
  return request<void>(`/analysis/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function getReport(analysisId: string, format: string = 'json') {
  return request<any>(`/reports/${analysisId}?format=${format}`);
}

// ---------------------------------------------------------------------------
// Domain Data
// ---------------------------------------------------------------------------

export interface CoverageTypeInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  common_limits: { min: number; typical: number; recommended: number };
}

export interface IndustryProfileInfo {
  id: string;
  name: string;
  description: string;
  typical_coverages: string[];
  risk_factors: string[];
}

export function getCoverageTypes() {
  return request<CoverageTypeInfo[]>('/analysis/domain/coverage-types');
}

export function getIndustryProfiles() {
  return request<IndustryProfileInfo[]>('/analysis/domain/industry-profiles');
}

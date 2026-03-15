/**
 * API client for the PolicyGuard backend.
 *
 * All endpoints are proxied through Next.js rewrites to avoid CORS.
 */

const BASE = '/api';

/** Default timeout for API requests (30 seconds — accommodates Render cold starts). */
const DEFAULT_TIMEOUT_MS = 30_000;

export const TOKEN_KEY = 'pg_access_token';
export const REFRESH_KEY = 'pg_refresh_token';

/**
 * Fetch wrapper with AbortController timeout and consistent AbortError handling.
 *
 *   INPUT ──▶ create controller+timer ──▶ fetch ──▶ clearTimeout ──▶ return Response
 *               │                                        │
 *             abort()                              AbortError caught
 *               │                                        │
 *           on timeout                        throw "Request timed out..."
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Request timed out. The server may be warming up — please wait and try again.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

/** Shared promise lock so concurrent 401s only trigger one refresh. */
let _refreshPromise: Promise<TokenResponse> | null = null;

// ---------------------------------------------------------------------------
// Auth API (raw fetch — not request() — to avoid circular refresh loops)
// ---------------------------------------------------------------------------

/** Exchange email + password for JWT tokens. Uses form-encoding (OAuth2 requirement). */
export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetchWithTimeout(`${BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 401 ? 'Invalid email or password' : `Login failed: ${text}`);
  }
  return res.json();
}

/** Exchange a refresh token for new access + refresh tokens. */
export async function refreshApi(refreshToken: string): Promise<TokenResponse> {
  const res = await fetchWithTimeout(
    `${BASE}/auth/refresh`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    10_000,
  );
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

/** Fetch the current user's profile using an explicit token (used at login/restore time). */
export async function getMeApi(token: string): Promise<UserProfile> {
  const res = await fetchWithTimeout(
    `${BASE}/auth/me`,
    { headers: { Authorization: `Bearer ${token}` } },
    10_000,
  );
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

// ---------------------------------------------------------------------------
// Core request helper (Bearer token injection + auto-refresh on 401)
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
  _isRetry = false,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      signal: controller.signal,
      ...fetchOptions,
    });

    // Auto-refresh on 401 (once)
    if (res.status === 401 && !_isRetry) {
      const storedRefresh =
        typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
      if (storedRefresh) {
        try {
          // Use a shared promise so concurrent 401s only refresh once
          if (!_refreshPromise) {
            _refreshPromise = refreshApi(storedRefresh).then((tokens) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem(TOKEN_KEY, tokens.access_token);
                localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
              }
              return tokens;
            }).finally(() => {
              _refreshPromise = null;
            });
          }
          await _refreshPromise;
          return request<T>(path, options, true);
        } catch {
          // Refresh failed — clear session and redirect
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please log in again.');
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
      throw new Error('Please log in to continue.');
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Request timed out. The server may be warming up — please wait a moment and try again.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Auth API (uses request() — normal JSON endpoint)
// ---------------------------------------------------------------------------

/** Create a new user account with friendly error messages. */
export async function registerApi(data: {
  email: string;
  password: string;
  full_name?: string;
}): Promise<UserProfile> {
  const res = await fetchWithTimeout(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409) throw new Error('This email is already registered.');
    if (res.status === 422) {
      // Parse Pydantic validation errors for human-readable message
      try {
        const body = JSON.parse(text);
        const detail = body?.detail;
        if (Array.isArray(detail)) {
          const msg = detail[0]?.msg ?? 'Invalid input.';
          throw new Error(msg.replace(/^Value error, /i, ''));
        }
        if (typeof detail === 'string') throw new Error(detail);
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error('Invalid registration data.');
        throw e;
      }
    }
    throw new Error('Registration failed. Please try again.');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/**
 * Quick health check against `/api/health`.
 * Returns `true` if the backend responds within 5 seconds, `false` otherwise.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>('/health', { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s for uploads

  try {
    const res = await fetch(`${BASE}/upload/${clientId}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upload error ${res.status}: ${body}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Upload timed out. The server may be warming up — please wait a moment and try again.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

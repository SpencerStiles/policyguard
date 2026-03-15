# PolicyGuard — Deferred Work

Items identified during plan review (2026-03-15) as out-of-scope for the current implementation pass.

---

## P2 — High Priority

### Auth flow unit tests (vitest)
**What:** Add vitest tests for `AuthContext` (login/logout/restore), `api.ts` (token injection, 401 auto-refresh, fetchWithTimeout), and `ProtectedRoute` (redirect logic).
**Why:** Zero frontend test coverage on the most security-critical code path.
**Pros:** Catches regressions in auth flow. Enables confident refactoring.
**Cons:** 2-3 hour investment. Requires mocking `fetch`/`localStorage`.
**Context:** The `fetchWithTimeout` helper (implemented in current pass) creates a clean seam for testing. Mock `fetch` in vitest, test the token injection and 401 → refresh → retry flow, and test `ProtectedRoute`'s redirect behaviour for unauthenticated/loading states.
**Effort:** M (2-3 hours)
**Depends on:** fetchWithTimeout refactor (done in current pass)

---

### CSP (Content Security Policy) headers
**What:** Configure CSP headers in `next.config.js` to restrict script sources, prevent inline script injection, and mitigate XSS token theft.
**Why:** Tokens are stored in `localStorage`. XSS vulnerabilities (from third-party scripts or injection) can exfiltrate them. CSP is the primary mitigation layer.
**Pros:** Significantly reduces XSS attack surface. Industry best practice.
**Cons:** Can break third-party scripts if misconfigured. Requires testing across all pages.
**Context:** Start with `script-src 'self'`, `object-src 'none'`, and `base-uri 'self'`. Next.js makes CSP configuration straightforward via `headers()` in `next.config.js`. Test that no inline scripts break (Next.js app router should be clean by default).
**Effort:** S (45 min)
**Depends on:** Nothing

---

### Sentry error tracking
**What:** Install `@sentry/nextjs` (frontend) and `sentry-sdk[fastapi]` (backend). Configure DSN, environment, and release tracking.
**Why:** No error tracking exists. Unhandled exceptions in production are invisible unless watching Render logs.
**Pros:** Proactive error alerting, full stack traces, user context, release tracking.
**Cons:** Free tier has limited events. Adds a dependency.
**Context:** For the frontend, use the `@sentry/nextjs` wizard (`npx @sentry/wizard@latest -i nextjs`). For the backend, add `sentry_sdk.init()` in `main.py` before the app factory. Set `traces_sample_rate=0.1` in production. Make DSN an env var (`SENTRY_DSN`).
**Effort:** S (1 hour)
**Depends on:** Nothing

---

## P3 — Future Infrastructure

### Background job queue (Celery + Redis)
**What:** Move PDF parsing and LLM analysis from FastAPI `BackgroundTasks` to a proper job queue (Celery with Redis broker, or `arq` as a lighter async alternative).
**Why:** `BackgroundTasks` runs in-process — jobs are lost on restart, no retry mechanism, no progress tracking, and heavy LLM calls compete with request serving.
**Pros:** Reliable job execution with retries. Progress tracking. Separates compute from request serving. Enables horizontal scaling.
**Cons:** Significant infrastructure addition (Redis, worker process, deployment config). 1-2 day effort.
**Context:** `arq` (async task queue) is a lighter alternative to Celery that fits the existing async SQLAlchemy patterns well. If Redis is added, the rate limiter (slowapi) can also use it for distributed rate limiting. Start with `arq` before committing to Celery's full Celery + Beat + Flower stack.
**Effort:** L (1-2 days)
**Depends on:** Nothing, but pairs well with multi-tenancy and scale work

---

## Multi-tab token refresh race
**What:** Coordinate token refresh across multiple browser tabs using `BroadcastChannel` API. When one tab refreshes successfully, broadcast new tokens to all other tabs.
**Why:** Two tabs hitting 401 simultaneously each independently call `/auth/refresh`. If the backend rotates refresh tokens on use, the second tab's refresh fails and logs the user out.
**Pros:** Eliminates "why did I get logged out?" confusion for multi-tab users.
**Cons:** `BroadcastChannel` isn't supported in all environments (Safari < 15.4, though this is now <1% of traffic).
**Context:** In `api.ts`, when `_refreshPromise` completes, also broadcast the new tokens via `new BroadcastChannel('pg_auth').postMessage({ type: 'tokens_refreshed', tokens })`. Listen in `AuthContext` to update localStorage/state when another tab refreshes.
**Effort:** S (45 min)
**Depends on:** Nothing

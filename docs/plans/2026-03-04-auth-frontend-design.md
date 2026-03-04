# PolicyGuard Frontend Authentication — Design Doc

**Date:** 2026-03-04
**Status:** Approved
**Approach:** Option A — React Context + localStorage

---

## Context

The backend has a complete JWT auth system (`POST /api/auth/register`, `POST /api/auth/token`, `POST /api/auth/refresh`, `GET /api/auth/me`). Access tokens expire in 30 minutes; refresh tokens in 7 days. The frontend currently has no auth at all — every API call returns 401.

---

## Goals

- Self-service registration (anyone can create an account, immediate access)
- Login page with email + password
- Protected routes redirect unauthenticated users to `/login`
- Silent token refresh keeps users logged in for up to 7 days
- Automatic logout on refresh token expiry

---

## Architecture

### AuthContext

A single `AuthContext` (React Context + Provider) wraps the entire app in `layout.tsx`. It holds:

- `user` — the authenticated user object (from `GET /api/auth/me`), or `null`
- `token` — the current access token string, or `null`
- `loading` — `true` while the initial refresh attempt is in flight
- `login(email, password)` — calls `POST /api/auth/token`, stores tokens, sets user
- `register(name, email, password)` — calls `POST /api/auth/register` then auto-logs in
- `logout()` — clears tokens from localStorage + context, redirects to `/login`

**Token storage:**
- `access_token` → `localStorage` (key: `pg_access_token`)
- `refresh_token` → `localStorage` (key: `pg_refresh_token`)

On mount, `AuthProvider` reads the refresh token from localStorage and calls `POST /api/auth/refresh`. If it succeeds, tokens and user are set silently. If it fails (expired, invalid), localStorage is cleared and the user stays unauthenticated.

### api.ts changes

The `request()` function is updated to:
1. Read the access token from localStorage on each call
2. Attach `Authorization: Bearer <token>` header
3. On 401: attempt one silent refresh, retry the original request
4. If refresh also fails: call `logout()` and throw

### Route protection

A `<ProtectedRoute>` client component wraps the authenticated app shell. It reads `loading` and `user` from `AuthContext`:
- If `loading === true`: render a full-page spinner (prevents flash)
- If `user === null`: redirect to `/login`
- Otherwise: render children

---

## Pages

### `/login`
- Fields: Email, Password
- Submit calls `auth.login()`
- On success: redirect to `/`
- Error states: "Invalid email or password", network/timeout errors
- Link: "Don't have an account? Sign up"

### `/register`
- Fields: Full Name (optional), Email, Password (min 8 chars)
- Submit calls `auth.register()` which registers then auto-logs in
- On success: redirect to `/`
- Error states: "Email already in use", validation errors
- Link: "Already have an account? Sign in"

### All other routes (`/`, `/clients`, `/policies`, `/analysis`, `/reports`)
- Wrapped in `<ProtectedRoute>`
- Sidebar gets a "Sign out" button (calls `auth.logout()`)

---

## Token Lifecycle

```
App load
  └─ Read pg_refresh_token from localStorage
      ├─ Found → POST /api/auth/refresh
      │   ├─ Success → set tokens + user in context → render app
      │   └─ Fail → clear localStorage → show login
      └─ Not found → show login

API request (any protected endpoint)
  └─ Attach Authorization: Bearer <access_token>
      ├─ 200 → normal response
      └─ 401 → POST /api/auth/refresh
          ├─ Success → retry original request with new token
          └─ Fail → logout() → redirect to /login

Login
  └─ POST /api/auth/token (form data: username=email, password)
      └─ Store access_token + refresh_token → set user → redirect /

Logout
  └─ Clear pg_access_token + pg_refresh_token from localStorage
      └─ Clear context → redirect /login
```

---

## Files Affected

| File | Change |
|------|--------|
| `src/contexts/auth.tsx` | New — AuthContext + AuthProvider |
| `src/components/protected-route.tsx` | New — loading/auth guard |
| `src/lib/api.ts` | Update — attach token, auto-refresh on 401 |
| `src/app/layout.tsx` | Wrap children in AuthProvider |
| `src/app/login/page.tsx` | New — login form |
| `src/app/register/page.tsx` | New — registration form |
| `src/components/sidebar.tsx` | Add Sign Out button |

---

## Out of Scope (v1)

- Email verification
- Password reset / forgot password
- OAuth (Google, GitHub)
- Role-based access control
- Invite-only mode

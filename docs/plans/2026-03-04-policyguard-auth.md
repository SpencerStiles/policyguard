# PolicyGuard Frontend Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add self-service login and registration to the PolicyGuard frontend, with JWT auth wired to all API calls and silent token refresh.

**Architecture:** React Context (`AuthProvider`) wraps the app, stores tokens in localStorage, and exposes `login`, `register`, and `logout`. The `api.ts` client reads the access token on every request and auto-refreshes on 401. A `ProtectedRoute` component guards all app pages.

**Tech Stack:** Next.js 14 App Router, React Context, localStorage, existing FastAPI JWT backend (`POST /api/auth/token`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/me`)

---

### Task 1: Add auth API functions to api.ts

**Files:**
- Modify: `apps/web/src/lib/api.ts`

The backend's `/api/auth/token` endpoint uses OAuth2 password flow — it expects `application/x-www-form-urlencoded` (not JSON). `/api/auth/register` and `/api/auth/refresh` use JSON.

**Step 1: Add token types and auth API functions**

Open `apps/web/src/lib/api.ts`. After the existing `checkHealth` function, add:

```typescript
// ---------------------------------------------------------------------------
// Auth types
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

// ---------------------------------------------------------------------------
// Auth API (these functions do NOT need a Bearer token)
// ---------------------------------------------------------------------------

/** Exchange email + password for JWT tokens. Uses form-encoding (OAuth2 requirement). */
export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(res.status === 401 ? 'Invalid email or password' : `Login failed: ${text}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be warming up — please wait and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Create a new user account. */
export async function registerApi(data: {
  email: string;
  password: string;
  full_name?: string;
}): Promise<UserProfile> {
  return request<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Exchange a refresh token for new access + refresh tokens. */
export async function refreshApi(refreshToken: string): Promise<TokenResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Refresh failed');
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch the current user's profile using an explicit token (used at login/restore time). */
export async function getMeApi(token: string): Promise<UserProfile> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

**Step 2: Update `request()` to attach the Bearer token and auto-refresh on 401**

Replace the existing `request` function with this version:

```typescript
const TOKEN_KEY = 'pg_access_token';
const REFRESH_KEY = 'pg_refresh_token';

async function request<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number; _isRetry?: boolean },
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, _isRetry = false, ...fetchOptions } = options ?? {};

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
          const tokens = await refreshApi(storedRefresh);
          if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, tokens.access_token);
            localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
          }
          return request<T>(path, { ...options, _isRetry: true });
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
```

**Step 3: Type-check**

```bash
cd /Users/spencer/Work/policyguard/apps/web && pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/lib/api.ts
git commit -m "feat: add auth API functions and Bearer token injection to api.ts"
```

---

### Task 2: Create AuthContext

**Files:**
- Create: `apps/web/src/contexts/auth.tsx`

**Step 1: Create the file**

```typescript
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'pg_access_token';
const REFRESH_KEY = 'pg_refresh_token';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: api.UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<api.UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  // On mount: restore session from refresh token
  useEffect(() => {
    const restore = async () => {
      const storedRefresh = localStorage.getItem(REFRESH_KEY);
      if (!storedRefresh) {
        setLoading(false);
        return;
      }
      try {
        const tokens = await api.refreshApi(storedRefresh);
        localStorage.setItem(TOKEN_KEY, tokens.access_token);
        localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
        const me = await api.getMeApi(tokens.access_token);
        setUser(me);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await api.loginApi(email, password);
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    const me = await api.getMeApi(tokens.access_token);
    setUser(me);
    router.push('/');
  };

  const register = async (fullName: string, email: string, password: string) => {
    await api.registerApi({ email, password, full_name: fullName || undefined });
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/contexts/auth.tsx
git commit -m "feat: add AuthContext with login, register, logout, and session restore"
```

---

### Task 3: Create ProtectedRoute component

**Files:**
- Create: `apps/web/src/components/protected-route.tsx`

**Step 1: Create the file**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Redirect in progress — render nothing to avoid flash
    return null;
  }

  return <>{children}</>;
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/components/protected-route.tsx
git commit -m "feat: add ProtectedRoute component with loading spinner and auth redirect"
```

---

### Task 4: Wire AuthProvider and ProtectedRoute into layout.tsx

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Update layout.tsx**

The current layout exports `metadata` (server component) and renders `<Sidebar>` inside a flex wrapper. We need to:
1. Wrap everything in `<AuthProvider>` (client component — Next.js handles this correctly when used in a server component)
2. Wrap the app shell in `<ProtectedRoute>`

Replace the full content of `layout.tsx` with:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/contexts/auth';
import { ProtectedRoute } from '@/components/protected-route';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PolicyGuard',
  description: 'AI-powered insurance policy analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-stone-50`}>
        <AuthProvider>
          <ProtectedRoute>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-8">{children}</main>
            </div>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/app/layout.tsx
git commit -m "feat: wrap app in AuthProvider and ProtectedRoute"
```

---

### Task 5: Create Login page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`

**Step 1: Create the directory and file**

```bash
mkdir -p /Users/spencer/Work/policyguard/apps/web/src/app/login
```

Create `apps/web/src/app/login/page.tsx`:

```typescript
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Sign in to PolicyGuard</h1>
          <p className="mt-1 text-sm text-gray-500">AI-powered insurance policy analysis</p>
        </div>

        {/* Card */}
        <div className="card px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-accent-600 hover:text-accent-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/app/login/
git commit -m "feat: add login page with email/password form and error handling"
```

---

### Task 6: Create Register page

**Files:**
- Create: `apps/web/src/app/register/page.tsx`

**Step 1: Create the directory and file**

```bash
mkdir -p /Users/spencer/Work/policyguard/apps/web/src/app/register
```

Create `apps/web/src/app/register/page.tsx`:

```typescript
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(fullName, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Start analyzing policies in minutes</p>
        </div>

        {/* Card */}
        <div className="card px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-accent-600 hover:text-accent-700">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/app/register/
git commit -m "feat: add registration page with full name, email, password form"
```

---

### Task 7: Add Sign Out button to sidebar + show user email

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`

**Step 1: Update sidebar to use AuthContext**

The sidebar currently has a static "PolicyGuard Pro" footer section. Replace it with the logged-in user's email and a Sign Out button.

Replace the entire file content with:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  FlaskConical,
  BarChart3,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col bg-brand-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">PolicyGuard</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-800 text-white border-l-2 border-accent-400 pl-[10px]'
                  : 'text-brand-300 hover:bg-brand-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-brand-800 px-4 py-4">
        {user && (
          <div className="mb-3 px-1">
            <p className="text-xs text-brand-400 truncate">{user.full_name || 'Account'}</p>
            <p className="text-xs text-brand-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

**Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/components/sidebar.tsx
git commit -m "feat: add sign out button and user email display to sidebar"
```

---

### Task 8: Make login/register pages bypass ProtectedRoute

**Context:** Right now, `/login` and `/register` are inside `RootLayout` which wraps everything in `<ProtectedRoute>`. An unauthenticated user hitting `/login` would get caught by the guard and redirected to `/login` — infinite loop.

The fix: give login and register their own `layout.tsx` that does NOT use the app shell (no sidebar, no `ProtectedRoute`). The root layout needs to change to separate auth pages from app pages.

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Move conceptually: all app pages move under `(app)` route group

**Step 1: Restructure into route groups**

Next.js route groups (folders wrapped in parentheses like `(app)`) don't affect the URL. Create the group layout:

```bash
mkdir -p /Users/spencer/Work/policyguard/apps/web/src/app/\(app\)
```

Create `apps/web/src/app/(app)/layout.tsx`:

```typescript
import { Sidebar } from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
```

**Step 2: Update root layout to only provide AuthProvider (no shell)**

Replace `apps/web/src/app/layout.tsx` with:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PolicyGuard',
  description: 'AI-powered insurance policy analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-stone-50`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: Move all app pages into (app) route group**

```bash
cd /Users/spencer/Work/policyguard/apps/web/src/app
mv page.tsx \(app\)/
mv clients \(app\)/
mv policies \(app\)/
mv analysis \(app\)/
mv reports \(app\)/
```

The `login/`, `register/`, and `__tests__/` directories stay at the root level.

**Step 4: Type-check and build**

```bash
pnpm exec tsc --noEmit
pnpm build
```

Expected: both pass with no errors. All 10 routes should appear (login, register, /, /clients, /clients/[id], /policies, /analysis, /analysis/[id], /reports).

**Step 5: Commit**

```bash
cd /Users/spencer/Work/policyguard
git add apps/web/src/app/
git commit -m "feat: restructure into (app) route group to isolate login/register from ProtectedRoute"
```

---

### Task 9: Final verification and deploy

**Step 1: Full type-check and build**

```bash
cd /Users/spencer/Work/policyguard/apps/web
pnpm exec tsc --noEmit
pnpm build
```

Expected: clean with all routes present.

**Step 2: Smoke test locally**

```bash
pnpm dev
```

Verify manually:
- `http://localhost:3000/login` → shows login form (no redirect loop)
- `http://localhost:3000/register` → shows register form
- `http://localhost:3000/` → redirects to `/login` (unauthenticated)
- Register with a test email → auto-logs in → lands on dashboard
- Refresh the page → stays logged in (session restored from refresh token)
- Sign out → back to `/login`

**Step 3: Push and deploy**

```bash
cd /Users/spencer/Work/policyguard
git push origin main
cd apps/web
vercel --prod --yes  # must run from repo root, not apps/web
```

Actually run from root:
```bash
cd /Users/spencer/Work/policyguard
vercel --prod --yes
```

**Step 4: Smoke test on production**

Visit `https://policyguard.spencerstiles.com/login` and repeat the manual test from Step 2.

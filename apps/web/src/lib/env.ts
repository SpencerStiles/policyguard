/**
 * env.ts — Centralized environment variable validation.
 *
 * Validates all required env vars at startup using Zod. Import `env` from
 * here instead of accessing `process.env` directly in application code so
 * misconfigured deployments fail fast with a clear error message.
 *
 * Public vars (NEXT_PUBLIC_*) are inlined at build time by Next.js.
 * Server-only vars are available only on the server side.
 */

import { z } from 'zod';

// --- Server-side variables (only available in API routes / server components) ---
const serverSchema = z.object({
  API_URL: z
    .string()
    .url()
    .default('http://localhost:8000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// --- Client-side variables (NEXT_PUBLIC_*) ---
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional(),
});

/**
 * Validated server-side environment.
 * Only import this in server contexts (API routes, server components,
 * middleware). Accessing in client code will throw.
 */
export const serverEnv = serverSchema.parse(process.env);

/**
 * Validated client-side environment.
 * Safe to import anywhere — these values are inlined at build time.
 */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

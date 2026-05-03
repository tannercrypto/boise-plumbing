// src/lib/auth/adminAuth.ts
// Phase 1: shared-secret guards (preserved for Jobber authorize route).
// Phase 2: adds session-based verifier used by middleware + server components.
//
// Contract: every function returns { ok: true } or { ok: false, reason: string }.

import { NextRequest } from "next/server";
import { getSessionFromRequest, getServerSession } from "./session";

export interface AuthResult {
  ok: boolean;
  reason?: string;
}

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// SESSION-BASED GUARDS (Phase 2 — used by middleware + server components)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify admin session from request cookies.
 * Used in middleware — synchronous NextRequest access.
 */
export function verifyAdminSession(request: NextRequest): AuthResult {
  const ok = getSessionFromRequest(request);
  return ok ? { ok: true } : { ok: false, reason: "Not authenticated" };
}

/**
 * Verify admin session in a server component or server action.
 * Uses Next.js cookies() — must be awaited.
 */
export async function verifyAdminServerSession(): Promise<AuthResult> {
  const ok = await getServerSession();
  return ok ? { ok: true } : { ok: false, reason: "Not authenticated" };
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD CHECK (used only in login route)
// ─────────────────────────────────────────────────────────────────────────────

export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_KEY) return false;
  // Constant-length comparison isn't needed here since this runs server-side
  // and ADMIN_KEY length would leak no useful info, but we keep it clean.
  return password === ADMIN_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTE GUARD — checks session cookie on API calls from the admin UI
// ─────────────────────────────────────────────────────────────────────────────
export function verifyAdminApiRequest(request: NextRequest): AuthResult {
  // Primary: session cookie (set by login)
  const sessionOk = getSessionFromRequest(request);
  if (sessionOk) return { ok: true };

  // Fallback: x-admin-key header (for direct API access / cron jobs)
  if (ADMIN_KEY) {
    const provided = request.headers.get("x-admin-key");
    if (provided && provided === ADMIN_KEY) return { ok: true };
  }

  return { ok: false, reason: "Not authenticated" };
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBBER AUTHORIZE GUARD — still key-based (admin-triggered, not session)
// ─────────────────────────────────────────────────────────────────────────────
export function verifyJobberAuthorizeRequest(
  searchParams: URLSearchParams
): AuthResult {
  if (!ADMIN_KEY) {
    return { ok: false, reason: "ADMIN_SECRET_KEY env var is not set" };
  }
  const provided = searchParams.get("key");
  if (!provided || provided !== ADMIN_KEY) {
    return { ok: false, reason: "Invalid or missing key" };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY PAGE GUARD — kept for any existing callers, now delegates to session
// ─────────────────────────────────────────────────────────────────────────────
export function verifyAdminPageRequest(
  _searchParams: Record<string, string>
): AuthResult {
  // Phase 2: this is no longer called directly — middleware handles it.
  // Kept for backward compatibility; always returns ok: false to force
  // middleware redirect. Server components should use verifyAdminServerSession().
  return { ok: false, reason: "Use session auth" };
}

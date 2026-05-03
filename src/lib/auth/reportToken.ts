// src/lib/auth/reportToken.ts
// HMAC-SHA256 signed tokens for client report access.
// Separate from admin session tokens — intentionally different secret + scope.
//
// Token format: base64url(payload) + "." + base64url(hmac)
// Payload: { clientSlug, scope: "report", iat }
//
// Tokens are long-lived (1 year) because they are shared with clients.
// Revocation: change REPORT_TOKEN_SECRET in env — all existing tokens invalid.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const REPORT_TOKEN_COOKIE = "report_access";
const REPORT_MAX_AGE      = 60 * 60 * 24 * 365; // 1 year

function getReportSecret(): string {
  // Use REPORT_TOKEN_SECRET if set, otherwise fall back to ADMIN_SECRET_KEY
  const secret =
    process.env.REPORT_TOKEN_SECRET ?? process.env.ADMIN_SECRET_KEY ?? "";
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SECRET_KEY or REPORT_TOKEN_SECRET must be set (min 16 chars)");
  }
  return `report:${secret}`; // namespace to prevent token reuse
}

interface ReportPayload {
  clientSlug: string;
  scope:      "report";
  iat:        number;
}

function signToken(payload: ReportPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig  = createHmac("sha256", getReportSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string, expectedSlug: string): boolean {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return false;

    const expected = createHmac("sha256", getReportSecret())
      .update(data)
      .digest("base64url");

    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expBuf)) return false;

    const payload: ReportPayload = JSON.parse(
      Buffer.from(data, "base64url").toString()
    );

    return payload.scope === "report" && payload.clientSlug === expectedSlug;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a signed report token for a client slug.
 * Store this as Client.reportToken in the DB.
 */
export function generateReportToken(clientSlug: string): string {
  return signToken({
    clientSlug,
    scope: "report",
    iat:   Math.floor(Date.now() / 1000),
  });
}

/**
 * Verify a token string against the expected client slug.
 */
export function verifyReportToken(token: string, clientSlug: string): boolean {
  return verifyToken(token, clientSlug);
}

/**
 * Check if the current request has a valid report cookie for this slug.
 * Used in report page server components.
 */
export async function hasReportAccess(clientSlug: string): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(REPORT_TOKEN_COOKIE)?.value;
    if (!token) return false;
    return verifyReportToken(token, clientSlug);
  } catch {
    return false;
  }
}

/**
 * Check access from a NextRequest (edge-compatible).
 * Checks both cookie and ?token= query param.
 */
export function hasReportAccessFromRequest(
  request: NextRequest,
  clientSlug: string
): boolean {
  // Check cookie
  const cookieToken = request.cookies.get(REPORT_TOKEN_COOKIE)?.value;
  if (cookieToken && verifyReportToken(cookieToken, clientSlug)) return true;

  // Check ?token= query param (for shareable direct links)
  const queryToken = request.nextUrl.searchParams.get("token");
  if (queryToken && verifyReportToken(queryToken, clientSlug)) return true;

  return false;
}

export { REPORT_TOKEN_COOKIE, REPORT_MAX_AGE };

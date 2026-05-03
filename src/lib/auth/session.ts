// src/lib/auth/session.ts
// HMAC-SHA256 signed session cookie — no external dependencies.
// The cookie value is: base64(payload) + "." + base64(hmac)
// Tamper-evident: any change to the payload invalidates the signature.
//
// Phase 3 upgrade path: replace sign/verify with jose JWT if you need
// expiry claims or multi-key rotation. The cookie name and middleware
// integration stay the same.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SECRET_KEY must be set and at least 16 characters. Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}

interface SessionPayload {
  role: "admin";
  iat: number; // issued-at unix seconds
}

function sign(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;

    const expected = createHmac("sha256", getSecret())
      .update(data)
      .digest("base64url");

    // Constant-time comparison prevents timing attacks
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    const payload: SessionPayload = JSON.parse(
      Buffer.from(data, "base64url").toString()
    );

    // Check expiry (SESSION_MAX_AGE seconds)
    const age = Math.floor(Date.now() / 1000) - payload.iat;
    if (age > SESSION_MAX_AGE) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a signed session token string (used in login route to set cookie).
 */
export function createSessionToken(): string {
  return sign({ role: "admin", iat: Math.floor(Date.now() / 1000) });
}

/**
 * Verify a session token string.
 * Returns true if valid + unexpired, false otherwise.
 */
export function verifySessionToken(token: string): boolean {
  return verify(token) !== null;
}

/**
 * Read and verify the session from the incoming request's cookies.
 * Used in middleware (has access to NextRequest).
 */
export function getSessionFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

/**
 * Read and verify the session from the Next.js cookie store.
 * Used in server components and server actions.
 */
export async function getServerSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

/**
 * Set the session cookie on a NextResponse (used in login route).
 */
export function setSessionCookie(response: NextResponse): void {
  const token = createSessionToken();
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "lax",
    maxAge:    SESSION_MAX_AGE,
    path:      "/",
  });
}

/**
 * Clear the session cookie (used in logout route).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });
}

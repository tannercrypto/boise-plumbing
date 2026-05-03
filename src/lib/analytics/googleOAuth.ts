// src/lib/analytics/googleOAuth.ts
// Shared Google OAuth 2.0 utilities used by both GSC and GA4 integrations.
// Both APIs use the same token endpoint and refresh flow.
//
// Required env vars:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI_GSC   (e.g. https://yourdomain.com/api/admin/analytics/gsc/callback)
//   GOOGLE_REDIRECT_URI_GA4   (e.g. https://yourdomain.com/api/admin/analytics/ga4/callback)

import type { GoogleTokenResponse } from "@/types";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT  = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = {
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION URL BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build GSC OAuth authorization URL.
 * State encodes siteId so the callback knows which Site to attach to.
 */
export function buildGscAuthUrl(siteId: string): string {
  const state = encodeState({ siteId, service: "gsc" });
  return buildAuthUrl(SCOPES.gsc, process.env.GOOGLE_REDIRECT_URI_GSC!, state);
}

/**
 * Build GA4 OAuth authorization URL.
 */
export function buildGa4AuthUrl(siteId: string): string {
  const state = encodeState({ siteId, service: "ga4" });
  return buildAuthUrl(SCOPES.ga4, process.env.GOOGLE_REDIRECT_URI_GA4!, state);
}

function buildAuthUrl(scope: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:      process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:   redirectUri,
    response_type:  "code",
    scope,
    access_type:    "offline",   // required for refresh token
    prompt:         "consent",   // force consent screen to get refresh_token every time
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN EXCHANGE
// ─────────────────────────────────────────────────────────────────────────────

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google token exchange failed (${resp.status}): ${err}`);
  }

  return resp.json() as Promise<GoogleTokenResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshGoogleToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    "refresh_token",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google token refresh failed (${resp.status}): ${err}`);
  }

  return resp.json() as Promise<GoogleTokenResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE ENCODING (same pattern as Jobber OAuth)
// ─────────────────────────────────────────────────────────────────────────────

export function encodeState(data: Record<string, string>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeState(
  state: string
): { siteId: string; service: "gsc" | "ga4" } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN FRESHNESS CHECK
// ─────────────────────────────────────────────────────────────────────────────

export function isGoogleTokenExpired(expiresAt: Date): boolean {
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry
  return new Date(expiresAt.getTime() - bufferMs) < new Date();
}

export function tokenExpiresAt(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

/**
 * Build GA4 auth URL with a pre-encoded state string.
 * Used by the GA4 connect route which needs to embed propertyId in state.
 */
export function buildGa4AuthUrlWithState(state: string): string {
  return buildAuthUrl(SCOPES.ga4, process.env.GOOGLE_REDIRECT_URI_GA4!, state);
}

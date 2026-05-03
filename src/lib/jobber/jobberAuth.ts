// src/lib/jobber/jobberAuth.ts
// Jobber OAuth 2.0 — authorization URL + code exchange.
// Scoped per-site: each site has its own connection.
// Docs: https://developer.getjobber.com/docs/auth/

import { saveJobberConnection } from "@/lib/db/jobberConnections";
import type { JobberTokenResponse } from "@/types";

const JOBBER_AUTH_URL  = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

/**
 * Build the OAuth authorization URL.
 * Embed siteId in the state param so the callback knows which site to attach to.
 */
export function buildJobberAuthorizationUrl(siteId: string): string {
  const state = Buffer.from(JSON.stringify({ siteId })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     process.env.JOBBER_CLIENT_ID!,
    redirect_uri:  process.env.JOBBER_REDIRECT_URI!,
    state,
  });

  return `${JOBBER_AUTH_URL}?${params.toString()}`;
}

/**
 * Decode the state param from the OAuth callback.
 */
export function decodeOAuthState(state: string): { siteId: string } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * Exchange an authorization code for tokens and persist them for the given site.
 */
export async function exchangeCodeForTokens(
  code: string,
  siteId: string
): Promise<JobberTokenResponse> {
  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      client_id:    process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
      redirect_uri: process.env.JOBBER_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Jobber token exchange failed (${response.status}): ${err}`);
  }

  const tokens: JobberTokenResponse = await response.json();
  await saveJobberConnection(siteId, tokens);
  return tokens;
}

// src/lib/jobber/jobberTokenRefresh.ts
// Token refresh logic, isolated so it can be called from
// jobberClient.ts and from the manual /api/jobber/refresh route.

import {
  getActiveJobberConnection,
  updateJobberConnection,
  isConnectionExpired,
} from "@/lib/db/jobberConnections";
import type { JobberTokenResponse } from "@/types";

const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

/**
 * Refresh the access token for a given site.
 * Persists the new tokens to the database.
 */
export async function refreshJobberToken(
  siteId: string
): Promise<JobberTokenResponse> {
  const connection = await getActiveJobberConnection(siteId);
  if (!connection) {
    throw new Error(
      `No active Jobber connection for site ${siteId}. Re-authorize via /api/jobber/authorize.`
    );
  }

  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: connection.refreshToken,
      client_id:     process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Jobber token refresh failed (${response.status}): ${err}`);
  }

  const tokens: JobberTokenResponse = await response.json();
  await updateJobberConnection(connection.id, tokens);
  return tokens;
}

/**
 * Get a valid access token for a site, refreshing if needed.
 * This is the main entry point — called by jobberClient.ts before every request.
 */
export async function getValidAccessToken(siteId: string): Promise<string> {
  const connection = await getActiveJobberConnection(siteId);

  if (!connection) {
    throw new Error(
      `Jobber not authorized for site ${siteId}. Visit /api/jobber/authorize to connect.`
    );
  }

  if (isConnectionExpired(connection.expiresAt)) {
    const refreshed = await refreshJobberToken(siteId);
    return refreshed.access_token;
  }

  return connection.accessToken;
}

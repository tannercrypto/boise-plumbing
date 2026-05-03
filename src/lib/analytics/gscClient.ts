// src/lib/analytics/gscClient.ts
// Google Search Console Search Analytics API client.
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
//
// NOTE: GSC "position" is an AVERAGE across all queries/dates in the range.
//       It is NOT an exact rank. Always label it "GSC Average Position".

import { prisma } from "@/lib/db/client";
import { refreshGoogleToken, isGoogleTokenExpired, tokenExpiresAt } from "./googleOAuth";
import type { GscApiRow } from "@/types";

const GSC_SEARCH_ANALYTICS_URL =
  "https://www.googleapis.com/webmaster/v3/sites/{siteUrl}/searchAnalytics/query";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function getValidGscToken(propertyId: string): Promise<string> {
  const prop = await prisma.gscProperty.findUnique({
    where: { id: propertyId },
  });
  if (!prop || !prop.isActive) {
    throw new Error(`No active GSC property: ${propertyId}`);
  }

  if (isGoogleTokenExpired(prop.expiresAt)) {
    const refreshed = await refreshGoogleToken(prop.refreshToken);
    await prisma.gscProperty.update({
      where: { id: propertyId },
      data: {
        accessToken: refreshed.access_token,
        expiresAt:   tokenExpiresAt(refreshed.expires_in),
        ...(refreshed.refresh_token
          ? { refreshToken: refreshed.refresh_token }
          : {}),
      },
    });
    return refreshed.access_token;
  }

  return prop.accessToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch search analytics rows for a date range, broken down by page and query.
 * Returns raw API rows — caller handles storage.
 */
export async function fetchGscRows(params: {
  propertyId:   string;
  propertyUri:  string;
  startDate:    string;   // YYYY-MM-DD
  endDate:      string;   // YYYY-MM-DD
  dimensions:   ("page" | "query" | "date")[];
  rowLimit?:    number;
}): Promise<GscApiRow[]> {
  const token = await getValidGscToken(params.propertyId);
  const url   = GSC_SEARCH_ANALYTICS_URL.replace(
    "{siteUrl}",
    encodeURIComponent(params.propertyUri)
  );

  const body = {
    startDate:  params.startDate,
    endDate:    params.endDate,
    dimensions: params.dimensions,
    rowLimit:   params.rowLimit ?? 5000,
    // Web type only — excludes Discover and Google News
    type:       "WEB",
  };

  const resp = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GSC API error (${resp.status}): ${err}`);
  }

  const data = await resp.json() as { rows?: GscApiRow[] };
  return data.rows ?? [];
}

/**
 * Fetch a single day's top queries with position (for keyword movement).
 */
export async function fetchGscQueriesForDate(params: {
  propertyId:  string;
  propertyUri: string;
  date:        string;   // YYYY-MM-DD
}): Promise<GscApiRow[]> {
  return fetchGscRows({
    propertyId:  params.propertyId,
    propertyUri: params.propertyUri,
    startDate:   params.date,
    endDate:     params.date,
    dimensions:  ["query"],
    rowLimit:    1000,
  });
}

/**
 * Fetch a single day's page-level metrics.
 */
export async function fetchGscPagesForDate(params: {
  propertyId:  string;
  propertyUri: string;
  date:        string;
}): Promise<GscApiRow[]> {
  return fetchGscRows({
    propertyId:  params.propertyId,
    propertyUri: params.propertyUri,
    startDate:   params.date,
    endDate:     params.date,
    dimensions:  ["page"],
    rowLimit:    200,
  });
}

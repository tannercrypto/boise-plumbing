// src/lib/analytics/ga4Client.ts
// Google Analytics Data API v1 client.
// Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
//
// Event name conventions (prepare but tolerate 0 counts):
//   form submits  → "generate_lead"  (fire this from LeadForm on success)
//   click-to-call → "click_to_call"  (fire from tel: anchor clicks)

import { prisma } from "@/lib/db/client";
import { refreshGoogleToken, isGoogleTokenExpired, tokenExpiresAt } from "./googleOAuth";
import type { Ga4MetricRecord, TrafficSourceBreakdown } from "@/types";

const GA4_RUN_REPORT_URL =
  "https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function getValidGa4Token(ga4PropertyDbId: string): Promise<{ token: string; numericPropertyId: string }> {
  const prop = await prisma.ga4Property.findUnique({
    where: { id: ga4PropertyDbId },
  });
  if (!prop || !prop.isActive) {
    throw new Error(`No active GA4 property: ${ga4PropertyDbId}`);
  }

  if (isGoogleTokenExpired(prop.expiresAt)) {
    const refreshed = await refreshGoogleToken(prop.refreshToken);
    await prisma.ga4Property.update({
      where: { id: ga4PropertyDbId },
      data: {
        accessToken: refreshed.access_token,
        expiresAt:   tokenExpiresAt(refreshed.expires_in),
        ...(refreshed.refresh_token
          ? { refreshToken: refreshed.refresh_token }
          : {}),
      },
    });
    return { token: refreshed.access_token, numericPropertyId: prop.propertyId };
  }

  return { token: prop.accessToken, numericPropertyId: prop.propertyId };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE METRICS FETCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch core daily metrics for a single date.
 * Returns one Ga4MetricRecord or null if no data.
 */
export async function fetchGa4DailyMetrics(params: {
  ga4PropertyDbId: string;
  date:            string;   // YYYY-MM-DD
}): Promise<Ga4MetricRecord | null> {
  const { token, numericPropertyId } = await getValidGa4Token(params.ga4PropertyDbId);
  const url = GA4_RUN_REPORT_URL.replace("{propertyId}", numericPropertyId);

  // ── Core metrics report ────────────────────────────────────────────────
  const coreBody = {
    dateRanges: [{ startDate: params.date, endDate: params.date }],
    metrics: [
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      // Event counts — will be 0 if events not yet implemented
      { name: "eventCount" },
    ],
    dimensionFilter: undefined,
  };

  const coreResp = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(coreBody),
  });

  if (!coreResp.ok) {
    const err = await coreResp.text();
    throw new Error(`GA4 core report error (${coreResp.status}): ${err}`);
  }

  const coreData = await coreResp.json() as { rows?: Ga4ReportRow[]; rowCount?: number };
  if (!coreData.rows || coreData.rows.length === 0) return null;

  const row = coreData.rows[0];
  const vals = row.metricValues ?? [];

  // ── Per-event counts report ────────────────────────────────────────────
  const eventBody = {
    dateRanges: [{ startDate: params.date, endDate: params.date }],
    dimensions: [{ name: "eventName" }],
    metrics:    [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["generate_lead", "click_to_call"],
        },
      },
    },
  };

  const eventResp = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  let formSubmits = 0;
  let callClicks  = 0;

  if (eventResp.ok) {
    const eventData = await eventResp.json() as { rows?: Ga4ReportRow[] };
    for (const eRow of eventData.rows ?? []) {
      const eventName  = eRow.dimensionValues?.[0]?.value ?? "";
      const eventCount = parseInt(eRow.metricValues?.[0]?.value ?? "0", 10);
      if (eventName === "generate_lead") formSubmits = eventCount;
      if (eventName === "click_to_call") callClicks  = eventCount;
    }
  }

  // ── Traffic source breakdown ───────────────────────────────────────────
  const trafficSources = await fetchGa4TrafficSources({
    token,
    numericPropertyId,
    date: params.date,
    url,
  });

  return {
    date:           new Date(params.date),
    users:          parseInt(vals[0]?.value ?? "0", 10),
    newUsers:       parseInt(vals[1]?.value ?? "0", 10),
    sessions:       parseInt(vals[2]?.value ?? "0", 10),
    pageViews:      parseInt(vals[3]?.value ?? "0", 10),
    formSubmits,
    callClicks,
    trafficSources,
  };
}

async function fetchGa4TrafficSources(params: {
  token:              string;
  numericPropertyId:  string;
  date:               string;
  url:                string;
}): Promise<TrafficSourceBreakdown[]> {
  const body = {
    dateRanges: [{ startDate: params.date, endDate: params.date }],
    dimensions: [
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionCampaignName" },
    ],
    metrics:  [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit:    50,
  };

  const resp = await fetch(params.url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) return [];

  const data = await resp.json() as { rows?: Ga4ReportRow[] };
  return (data.rows ?? []).map((row) => ({
    source:   row.dimensionValues?.[0]?.value ?? "(direct)",
    medium:   row.dimensionValues?.[1]?.value ?? "(none)",
    campaign: row.dimensionValues?.[2]?.value ?? "(not set)",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GA4 API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Ga4ReportRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?:    Array<{ value?: string }>;
}

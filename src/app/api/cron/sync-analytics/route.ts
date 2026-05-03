// src/app/api/cron/sync-analytics/route.ts
// POST /api/cron/sync-analytics
// Pulls yesterday's GSC and GA4 data for all connected properties.
//
// Schedule: daily at 06:00 UTC (data is typically 2-3 days delayed in GSC,
//           but fetching yesterday ensures we catch anything that's finalised).
//
// Authentication: CRON_SECRET header (set in env + Vercel cron config).
// Vercel cron.json example:
//   { "crons": [{ "path": "/api/cron/sync-analytics", "schedule": "0 6 * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import { syncAllGscProperties } from "@/lib/analytics/gscSync";
import { syncAllGa4Properties } from "@/lib/analytics/ga4Sync";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = new URL(request.url).searchParams.get("date") ?? undefined;

  const [gscResults, ga4Results] = await Promise.allSettled([
    syncAllGscProperties(dateParam),
    syncAllGa4Properties(dateParam),
  ]);

  const gsc = gscResults.status === "fulfilled" ? gscResults.value : [];
  const ga4 = ga4Results.status === "fulfilled" ? ga4Results.value : [];

  const errors = [
    ...gsc.filter((r) => r.error).map((r) => `GSC ${r.propertyId}: ${r.error}`),
    ...ga4.filter((r) => !r.success).map((r) => `GA4 ${r.ga4PropertyDbId}: ${r.error}`),
  ];

  console.log(`[sync-analytics] GSC: ${gsc.length} properties, GA4: ${ga4.length} properties, Errors: ${errors.length}`);

  return NextResponse.json({
    success:    errors.length === 0,
    date:       dateParam ?? "yesterday",
    gscSynced:  gsc.length,
    ga4Synced:  ga4.length,
    errors,
  });
}

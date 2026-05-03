// src/app/api/cron/compute-snapshots/route.ts
// POST /api/cron/compute-snapshots
// Computes today's AssetSnapshot for every active site.
// Should run AFTER sync-analytics (analytics data needs to be present first).
//
// Vercel cron.json:
//   { "path": "/api/cron/compute-snapshots", "schedule": "0 7 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { computeAllSiteSnapshots } from "@/lib/analytics/assetSnapshot";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await computeAllSiteSnapshots();
  const errors  = results.filter((r) => !r.success);

  console.log(`[compute-snapshots] ${results.length} sites, ${errors.length} errors`);

  return NextResponse.json({
    success:       errors.length === 0,
    sitesSnapshot: results.length,
    errors:        errors.map((r) => `${r.siteId}: ${r.error}`),
  });
}

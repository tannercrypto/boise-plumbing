// src/app/api/cron/check-alerts/route.ts
// POST /api/cron/check-alerts
// Evaluates alert thresholds for all sites and writes Alert rows.
// Should run AFTER compute-snapshots.
//
// Vercel cron.json:
//   { "path": "/api/cron/check-alerts", "schedule": "0 8 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { checkAllSiteAlerts } from "@/lib/analytics/alertEngine";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkAllSiteAlerts();

  console.log("[check-alerts] Alert check complete");

  return NextResponse.json({ success: true, message: "Alert check complete" });
}

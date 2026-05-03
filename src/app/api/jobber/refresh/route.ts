// src/app/api/jobber/refresh/route.ts
// POST /api/jobber/refresh
// Manually trigger token refresh for a site (admin use / cron job).

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { refreshJobberToken } from "@/lib/jobber/jobberTokenRefresh";

export async function POST(request: NextRequest) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { siteId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const tokens = await refreshJobberToken(body.siteId);
    return NextResponse.json({
      success:    true,
      message:    "Token refreshed successfully",
      expiresIn:  tokens.expires_in,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

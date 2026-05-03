// src/app/api/admin/analytics/ga4/connect/route.ts
// GET /api/admin/analytics/ga4/connect?siteSlug=boise-plumbing&propertyId=123456789
// Initiates Google OAuth for GA4 Data API access.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { buildGa4AuthUrl, encodeState } from "@/lib/analytics/googleOAuth";
import { getSiteBySlug } from "@/lib/db/sites";

export async function GET(request: NextRequest) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const siteSlug   = request.nextUrl.searchParams.get("siteSlug")   ?? "boise-plumbing";
  const propertyId = request.nextUrl.searchParams.get("propertyId") ?? "";

  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required (e.g. ?propertyId=123456789)" },
      { status: 400 }
    );
  }

  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json({ error: `Site not found: ${siteSlug}` }, { status: 404 });
  }

  // Embed GA4 propertyId in state so the callback can store it
  const state = encodeState({ siteId: site.id, service: "ga4", propertyId });

  // Build auth URL with custom state
  const { buildGa4AuthUrlWithState } = await import("@/lib/analytics/googleOAuth");
  const authUrl = buildGa4AuthUrlWithState(state);
  return NextResponse.redirect(authUrl);
}

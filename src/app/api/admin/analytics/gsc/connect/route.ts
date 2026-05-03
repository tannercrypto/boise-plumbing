// src/app/api/admin/analytics/gsc/connect/route.ts
// GET /api/admin/analytics/gsc/connect?siteSlug=boise-plumbing
// Initiates Google OAuth for Search Console access.
// Protected by admin session cookie.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { buildGscAuthUrl } from "@/lib/analytics/googleOAuth";
import { getSiteBySlug } from "@/lib/db/sites";

export async function GET(request: NextRequest) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const siteSlug = request.nextUrl.searchParams.get("siteSlug") ?? "boise-plumbing";
  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json({ error: `Site not found: ${siteSlug}` }, { status: 404 });
  }

  const authUrl = buildGscAuthUrl(site.id);
  return NextResponse.redirect(authUrl);
}

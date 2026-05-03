// src/app/api/admin/jobber-connect/route.ts
// POST /api/admin/jobber-connect
// Reads ADMIN_SECRET_KEY server-side and redirects to Jobber OAuth.
// Replaces the pattern of embedding the key in client-rendered hrefs.
// Protected by session cookie — only authenticated admins can call this.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { buildJobberAuthorizationUrl } from "@/lib/jobber/jobberAuth";
import { getSiteBySlug } from "@/lib/db/sites";

export async function GET(request: NextRequest) {
  // Session-based auth (no key in URL)
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const siteSlug = request.nextUrl.searchParams.get("siteSlug") ?? "boise-plumbing";
  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json({ error: `Site not found: ${siteSlug}` }, { status: 404 });
  }

  const authUrl = buildJobberAuthorizationUrl(site.id);
  return NextResponse.redirect(authUrl);
}

// src/app/api/jobber/authorize/route.ts
// GET /api/jobber/authorize?key=ADMIN_KEY&siteSlug=boise-plumbing
// Redirects to Jobber OAuth, embedding siteId in the state param.

import { NextRequest, NextResponse } from "next/server";
import { verifyJobberAuthorizeRequest } from "@/lib/auth/adminAuth";
import { buildJobberAuthorizationUrl } from "@/lib/jobber/jobberAuth";
import { getSiteBySlug } from "@/lib/db/sites";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const auth = verifyJobberAuthorizeRequest(searchParams);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteSlug = searchParams.get("siteSlug") ?? "boise-plumbing";
  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json(
      { error: `Site not found: ${siteSlug}` },
      { status: 404 }
    );
  }

  const authUrl = buildJobberAuthorizationUrl(site.id);
  return NextResponse.redirect(authUrl);
}

// src/app/api/admin/analytics/gsc/callback/route.ts
// GET /api/admin/analytics/gsc/callback
// Google redirects here after GSC OAuth authorization.

import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, decodeState, tokenExpiresAt } from "@/lib/analytics/googleOAuth";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/sites?gsc_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const stateData = decodeState(state);
  if (!stateData || stateData.service !== "gsc") {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  try {
    const tokens = await exchangeGoogleCode(
      code,
      process.env.GOOGLE_REDIRECT_URI_GSC!
    );

    if (!tokens.refresh_token) {
      // This happens if the user already authorized and we didn't force re-consent
      return NextResponse.redirect(
        new URL(
          `/admin/sites?gsc_error=${encodeURIComponent("No refresh token returned. Revoke access in Google Account and retry.")}`,
          request.url
        )
      );
    }

    // Determine the property URI from the site domain
    const site = await prisma.site.findUnique({ where: { id: stateData.siteId } });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Default to sc-domain: prefix (covers all protocols)
    const propertyUri = `sc-domain:${site.domain}`;

    await prisma.gscProperty.upsert({
      where: { siteId: stateData.siteId },
      create: {
        siteId:       stateData.siteId,
        propertyUri,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    tokenExpiresAt(tokens.expires_in),
        isActive:     true,
      },
      update: {
        propertyUri,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    tokenExpiresAt(tokens.expires_in),
        isActive:     true,
      },
    });

    return NextResponse.redirect(
      new URL("/admin/sites?gsc_connected=true", request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GSC connection failed";
    console.error("[GSC callback]", msg);
    return NextResponse.redirect(
      new URL(`/admin/sites?gsc_error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}

// src/app/api/admin/analytics/ga4/callback/route.ts
// GET /api/admin/analytics/ga4/callback
// Google redirects here after GA4 OAuth authorization.

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
      new URL(`/admin/sites?ga4_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const stateData = decodeState(state) as {
    siteId: string;
    service: string;
    propertyId?: string;
  } | null;

  if (!stateData || stateData.service !== "ga4") {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const ga4PropertyId = stateData.propertyId;
  if (!ga4PropertyId) {
    return NextResponse.json({ error: "Missing propertyId in state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeGoogleCode(
      code,
      process.env.GOOGLE_REDIRECT_URI_GA4!
    );

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(
          `/admin/sites?ga4_error=${encodeURIComponent("No refresh token. Revoke access in Google Account and retry.")}`,
          request.url
        )
      );
    }

    await prisma.ga4Property.upsert({
      where: { siteId: stateData.siteId },
      create: {
        siteId:       stateData.siteId,
        propertyId:   ga4PropertyId,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    tokenExpiresAt(tokens.expires_in),
        isActive:     true,
      },
      update: {
        propertyId:   ga4PropertyId,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    tokenExpiresAt(tokens.expires_in),
        isActive:     true,
      },
    });

    return NextResponse.redirect(
      new URL("/admin/sites?ga4_connected=true", request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GA4 connection failed";
    console.error("[GA4 callback]", msg);
    return NextResponse.redirect(
      new URL(`/admin/sites?ga4_error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}

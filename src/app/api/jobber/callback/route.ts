// src/app/api/jobber/callback/route.ts
// GET /api/jobber/callback
// Jobber redirects here after OAuth authorization.
// Extracts siteId from state param, saves tokens for that site.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, decodeOAuthState } from "@/lib/jobber/jobberAuth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const error = searchParams.get("error");
  if (error) {
    console.error("[Jobber OAuth] Authorization error:", error);
    return NextResponse.redirect(
      new URL(
        `/admin/leads?jobber_error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // Decode state to get siteId
  const stateData = state ? decodeOAuthState(state) : null;
  if (!stateData?.siteId) {
    return NextResponse.json(
      { error: "Invalid or missing state parameter" },
      { status: 400 }
    );
  }

  try {
    await exchangeCodeForTokens(code, stateData.siteId);
    console.log(
      `[Jobber OAuth] Connected site ${stateData.siteId} successfully`
    );

    return NextResponse.redirect(
      new URL("/admin/leads?jobber_connected=true", request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token exchange failed";
    console.error("[Jobber OAuth] Token exchange failed:", msg);

    return NextResponse.redirect(
      new URL(
        `/admin/leads?jobber_error=${encodeURIComponent(msg)}`,
        request.url
      )
    );
  }
}

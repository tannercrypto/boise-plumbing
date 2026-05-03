// src/app/api/reports/auth/route.ts
// POST /api/reports/auth
// Validates a report token and sets the report_access cookie.
// Called from ReportLoginForm client component.

import { NextRequest, NextResponse } from "next/server";
import { getClientBySlug } from "@/lib/db/reports";
import {
  verifyReportToken,
  REPORT_TOKEN_COOKIE,
  REPORT_MAX_AGE,
} from "@/lib/auth/reportToken";

export async function POST(request: NextRequest) {
  let body: { clientSlug?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { clientSlug, token } = body;
  if (!clientSlug || !token) {
    return NextResponse.json({ success: false, error: "Missing clientSlug or token" }, { status: 400 });
  }

  const client = await getClientBySlug(clientSlug);
  if (!client || !client.reportToken) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  // Validate: token must match client's stored reportToken
  const valid = verifyReportToken(token, clientSlug);
  if (!valid || token !== client.reportToken) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(REPORT_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   REPORT_MAX_AGE,
    path:     "/",
  });

  return response;
}

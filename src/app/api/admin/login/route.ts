// src/app/api/admin/login/route.ts
// POST /api/admin/login
// Accepts a native HTML form submission (application/x-www-form-urlencoded).
// On success: sets HttpOnly session cookie + redirects to admin.
// On failure: redirects back to login with ?error=invalid.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/auth/adminAuth";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password")?.toString() ?? "";
  const from     = formData.get("from")?.toString()     ?? "/admin/leads";

  // Validate redirect target — only allow internal paths
  const redirectTo = from.startsWith("/admin") ? from : "/admin/leads";

  if (!verifyAdminPassword(password)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("from", redirectTo);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(
    new URL(redirectTo, request.url),
    { status: 303 }
  );

  setSessionCookie(response);
  return response;
}

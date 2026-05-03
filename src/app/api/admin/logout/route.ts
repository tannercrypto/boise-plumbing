// src/app/api/admin/logout/route.ts
// POST /api/admin/logout — clears the session cookie.

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/admin/login", request.url),
    { status: 303 }
  );
  clearSessionCookie(response);
  return response;
}

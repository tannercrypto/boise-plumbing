// src/middleware.ts
// Edge middleware — protects /admin/* routes.
// /reports/* routes use their own token-based auth inside each page.

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Let the login page through unconditionally
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect everything else under /admin
  if (pathname.startsWith("/admin")) {
    const authenticated = getSessionFromRequest(request);

    if (!authenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /reports/* — token auth handled inside each page server component
  // No middleware interception needed here

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

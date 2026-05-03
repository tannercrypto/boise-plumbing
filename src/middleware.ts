import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest): NextResponse {
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*"] };

// src/app/api/admin/portfolio/route.ts
// GET /api/admin/portfolio
// Returns portfolio-level stats for the admin dashboard.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { getPortfolioStats } from "@/lib/db/revenue";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const stats = await getPortfolioStats();
  return NextResponse.json<ApiResponse>({ success: true, data: stats });
}

// src/app/api/admin/leads/[id]/revenue/route.ts
// PATCH /api/admin/leads/:id/revenue
// Updates estimatedJobValue, confirmedJobValue, revenueSource, commissionAmount.
// When confirmedJobValue changes, triggers asset snapshot recomputation.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { getLeadById } from "@/lib/db/leads";
import { updateLeadRevenue } from "@/lib/db/revenue";
import type { ApiResponse } from "@/types";

const revenueSchema = z.object({
  estimatedJobValue: z.number().nonnegative().nullable().optional(),
  confirmedJobValue: z.number().nonnegative().nullable().optional(),
  revenueSource:     z.enum(["MANUAL", "JOBBER"]).nullable().optional(),
  commissionAmount:  z.number().nonnegative().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = revenueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error:   "Validation failed",
        data:    parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const lead = await getLeadById(id);
  if (!lead) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Lead not found" },
      { status: 404 }
    );
  }

  const updated = await updateLeadRevenue(id, parsed.data);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: "Revenue updated",
    data: {
      id:                updated.id,
      estimatedJobValue: updated.estimatedJobValue,
      confirmedJobValue: updated.confirmedJobValue,
      revenueSource:     updated.revenueSource,
      commissionAmount:  updated.commissionAmount,
    },
  });
}

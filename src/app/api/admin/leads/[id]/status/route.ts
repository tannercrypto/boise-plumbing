// src/app/api/admin/leads/[id]/status/route.ts
// PATCH /api/admin/leads/:id/status
// Body: { "status": "CONTACTED" | "BOOKED" | "LOST" | "NEW" }

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { updateLeadStatus, getLeadById } from "@/lib/db/leads";
import type { ApiResponse, LeadStatus } from "@/types";

const ALLOWED_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "BOOKED",
  "LOST",
];

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

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const status = body.status as LeadStatus;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error:   `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
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

  const updated = await updateLeadStatus(id, status);

  return NextResponse.json<ApiResponse>({
    success: true,
    data:    { id: updated.id, status: updated.status },
    message: `Status updated to ${status}`,
  });
}

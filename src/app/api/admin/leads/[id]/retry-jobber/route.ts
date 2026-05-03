// src/app/api/admin/leads/[id]/retry-jobber/route.ts
// POST /api/admin/leads/:id/retry-jobber
// Resets a lead's Jobber sync state and attempts sync again.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import {
  getLeadById,
  resetLeadForJobberRetry,
  markLeadJobberSuccess,
  markLeadJobberError,
  markLeadJobberSkipped,
} from "@/lib/db/leads";
import { getSiteById } from "@/lib/db/sites";
import { syncLeadToJobber } from "@/lib/jobber/jobberLeadSync";
import type { ApiResponse, LeadRecord } from "@/types";

export async function POST(
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

  const lead = await getLeadById(id);
  if (!lead) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Lead not found" },
      { status: 404 }
    );
  }

  const site = await getSiteById(lead.siteId);
  if (!site) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Site not found for this lead" },
      { status: 404 }
    );
  }

  // Reset to PENDING before attempting
  await resetLeadForJobberRetry(id);

  // Re-run sync
  const syncResult = await syncLeadToJobber(
    {
      ...lead,
      createdAt:      lead.createdAt.toISOString(),
      updatedAt:      lead.updatedAt.toISOString(),
      jobberSyncedAt: null,
      // After reset these are null
      jobberClientId:   null,
      jobberRequestId:  null,
      jobberSyncStatus: "PENDING",
      jobberError:      null,
      status:           "NEW",
    } as LeadRecord,
    site.id
  );

  if (syncResult.status === "SUCCESS" && syncResult.clientId && syncResult.requestId) {
    await markLeadJobberSuccess(id, syncResult.clientId, syncResult.requestId);
    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Jobber sync succeeded.",
      data:    { jobberClientId: syncResult.clientId, jobberRequestId: syncResult.requestId },
    });
  }

  if (syncResult.status === "SKIPPED") {
    await markLeadJobberSkipped(id);
    return NextResponse.json<ApiResponse>({
      success: false,
      error:   "Jobber is not connected for this site.",
    });
  }

  await markLeadJobberError(id, syncResult.error ?? "Unknown error");
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error:   syncResult.error ?? "Jobber sync failed.",
    },
    { status: 502 }
  );
}

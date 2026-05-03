// src/app/api/admin/sites/[siteSlug]/call-tracking/route.ts
// PATCH /api/admin/sites/:siteSlug/call-tracking
// Updates call tracking configuration fields on a Site.
// Does NOT integrate with Twilio — pure data storage for Phase 5.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { getSiteBySlug } from "@/lib/db/sites";
import { prisma } from "@/lib/db/client";
import type { ApiResponse } from "@/types";

const callTrackingSchema = z.object({
  trackingPhone:        z.string().max(30).optional().nullable(),
  forwardingPhone:      z.string().max(30).optional().nullable(),
  callTrackingProvider: z.string().max(100).optional().nullable(),
  callTrackingEnabled:  z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { siteSlug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = callTrackingSchema.safeParse(body);
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

  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Site not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data:  parsed.data,
    select: {
      trackingPhone:        true,
      forwardingPhone:      true,
      callTrackingProvider: true,
      callTrackingEnabled:  true,
    },
  });

  return NextResponse.json<ApiResponse>({
    success: true,
    message: "Call tracking settings updated",
    data:    updated,
  });
}

// GET — return current settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Site not found" },
      { status: 404 }
    );
  }

  const data = await prisma.site.findUnique({
    where:  { id: site.id },
    select: {
      trackingPhone:        true,
      forwardingPhone:      true,
      callTrackingProvider: true,
      callTrackingEnabled:  true,
    },
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}

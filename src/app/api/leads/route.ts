// src/app/api/leads/route.ts
// POST /api/leads  — submit a lead (public)
// GET  /api/leads  — admin: list leads

import { NextRequest, NextResponse } from "next/server";
import { leadSubmissionSchema } from "@/lib/utils/validation";
import { getSiteBySlug } from "@/lib/db/sites";
import { findOrCreateClient } from "@/lib/db/clients";
import {
  createLead,
  markLeadJobberSuccess,
  markLeadJobberError,
  markLeadJobberSkipped,
  getLeads,
} from "@/lib/db/leads";
import { syncLeadToJobber } from "@/lib/jobber/jobberLeadSync";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import {
  resolveLeadDestination,
  shouldSyncToJobber,
  shouldSendSms,
} from "@/lib/routing/leadRouter";
import { prisma } from "@/lib/db/client";
import { enqueueLeadMessages } from "@/lib/messaging/messageQueue";
import { limitLeadSubmission } from "@/lib/security/rateLimit";
import { isHoneypotFilled } from "@/lib/security/honeypot";
import type { ApiResponse, LeadSubmitResponse, LeadRecord } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/leads
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── 0. Rate limit ───────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = limitLeadSubmission(ip);
  if (!rl.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  // ── 1. Parse ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── 1a. Honeypot check ──────────────────────────────────────────────────
  if (isHoneypotFilled(body as Record<string, unknown>)) {
    // Silently return success — bots should not know they were rejected
    console.warn(`[leads] Honeypot triggered from IP ${ip}`);
    return NextResponse.json<ApiResponse>(
      { success: true, data: { leadId: "hp", jobberSyncStatus: "SKIPPED", message: "Request received!" } },
      { status: 201 }
    );
  }

  // ── 2. Validate ─────────────────────────────────────────────────────────
  const parsed = leadSubmissionSchema.safeParse(body);
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

  const data = parsed.data;

  // ── 3. Resolve site ─────────────────────────────────────────────────────
  const site = await getSiteBySlug(data.siteSlug);
  if (!site || !site.isActive) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Site not found" },
      { status: 404 }
    );
  }

  // ── 4. Extract request metadata ─────────────────────────────────────────
  // ip already resolved at step 0 for rate limiting
  const ipAddress = ip !== "unknown" ? ip : undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  // ── 5. Deduplicate / upsert Client ──────────────────────────────────────
  const client = await findOrCreateClient({
    name:    data.name,
    phone:   data.phone,
    email:   data.email,
    address: data.address,
  });

  // ── 6. Routing decision (includes client for per-client overrides) ───────
  const { destination } = resolveLeadDestination({
    siteSlug: data.siteSlug,
    urgency:  data.urgency,
    service:  data.service,
    clientId: client.id,
  });

  // ── 7. Create Lead record ───────────────────────────────────────────────
  const lead = await createLead({
    siteId:      site.id,
    clientId:    client.id,
    payload:     data,
    ipAddress,
    userAgent,
    sourceLabel: site.sourceLabel,
    routeUsed:   destination,
  });

  // ── 8. Jobber sync ──────────────────────────────────────────────────────
  let jobberSyncStatus: LeadRecord["jobberSyncStatus"] = "PENDING";

  if (shouldSyncToJobber(destination)) {
    try {
      const syncResult = await syncLeadToJobber(
        {
          ...lead,
          createdAt:      lead.createdAt.toISOString(),
          updatedAt:      lead.updatedAt.toISOString(),
          jobberSyncedAt: lead.jobberSyncedAt?.toISOString() ?? null,
        } as LeadRecord,
        site.id
      );

      if (syncResult.status === "SUCCESS" && syncResult.clientId && syncResult.requestId) {
        await markLeadJobberSuccess(lead.id, syncResult.clientId, syncResult.requestId);
        jobberSyncStatus = "SUCCESS";
      } else if (syncResult.status === "SKIPPED") {
        await markLeadJobberSkipped(lead.id);
        jobberSyncStatus = "SKIPPED";
      } else {
        await markLeadJobberError(lead.id, syncResult.error ?? "Unknown error");
        jobberSyncStatus = "ERROR";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected sync error";
      await markLeadJobberError(lead.id, msg);
      jobberSyncStatus = "ERROR";
      console.error(`[API /leads] Jobber sync exception for lead ${lead.id}:`, msg);
    }
  } else {
    await markLeadJobberSkipped(lead.id);
    jobberSyncStatus = "SKIPPED";
  }

  // ── 9. SMS queuing ───────────────────────────────────────────────────────
  if (shouldSendSms(destination)) {
    // Fetch client settings for recipient phones + template
    const settings = await prisma.clientSettings.findUnique({
      where:   { clientId: client.id },
      include: { defaultMessageTemplate: true },
    });

    // Build recipient list: client settings phones + site forwarding phone
    const recipients = new Set<string>();

    if (settings?.messagingEnabled && Array.isArray(settings.messageRecipientPhones)) {
      for (const p of settings.messageRecipientPhones as string[]) {
        if (p) recipients.add(p);
      }
    }
    // Always include site forwarding phone if configured
    if (site.forwardingPhone) recipients.add(site.forwardingPhone);

    if (recipients.size > 0) {
      enqueueLeadMessages({
        lead: {
          ...lead,
          createdAt:      lead.createdAt.toISOString(),
          updatedAt:      lead.updatedAt.toISOString(),
          jobberSyncedAt: null,
        } as LeadRecord,
        siteId:          site.id,
        siteName:        site.name,
        recipientPhones: Array.from(recipients),
        customTemplate:  settings?.defaultMessageTemplate?.templateBody,
        clientId:        client.id,
        templateId:      settings?.defaultMessageTemplateId ?? undefined,
      }).catch((err) => {
        // Never let SMS queuing break the form submission
        console.error(`[API /leads] SMS queue error for lead ${lead.id}:`, err);
      });
    }
  }

  // ── 10. Respond ──────────────────────────────────────────────────────────
  const successMessage =
    data.urgency === "EMERGENCY"
      ? "Request received! Our team will call you within 15 minutes."
      : "Request received! We'll be in touch within 1 hour.";

  return NextResponse.json<ApiResponse<LeadSubmitResponse>>(
    {
      success: true,
      data: {
        leadId: lead.id,
        jobberSyncStatus,
        message: successMessage,
      },
    },
    { status: 201 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leads  (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get("limit")  ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const siteId = url.searchParams.get("siteId") ?? undefined;

  const { leads, total } = await getLeads({ siteId, limit, offset });

  return NextResponse.json<ApiResponse>({
    success: true,
    data:    { leads, total },
  });
}

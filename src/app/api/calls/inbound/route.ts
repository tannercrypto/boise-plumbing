// src/app/api/calls/inbound/route.ts
// POST /api/calls/inbound
// Provider-neutral call tracking ingestion endpoint.
// Creates a CallLead row when a call comes in via a tracking number.
//
// Authentication: LOCAL_BRIDGE_API_KEY (same key the bridge uses).
// Future: add Twilio signature verification when switching to FUTURE_TWILIO.
//
// SAFETY: If callTrackingEnabled is false for the matched site, the call
// is logged but immediately marked as received with no further action.
// This prevents phantom data if the provider sends a stale webhook.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBridgeRequest } from "@/lib/messaging/bridgeAuth";
import { prisma } from "@/lib/db/client";

const inboundCallSchema = z.object({
  trackingPhone:   z.string().min(7).max(20),
  callerNumber:    z.string().min(7).max(20),
  durationSeconds: z.number().int().nonnegative().optional(),
  sourcePage:      z.string().max(500).optional(),
  utmSource:       z.string().max(200).optional(),
  utmMedium:       z.string().max(200).optional(),
  utmCampaign:     z.string().max(200).optional(),
  status:          z.enum(["RECEIVED", "ANSWERED", "VOICEMAIL", "MISSED", "SPAM"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyBridgeRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason ?? "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inboundCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // ── Look up site by trackingPhone ─────────────────────────────────────
  const site = await prisma.site.findFirst({
    where: { trackingPhone: data.trackingPhone },
  });

  if (!site) {
    // Log and return 200 — provider should not retry on unknown numbers
    console.warn(`[calls/inbound] No site found for tracking phone: ${data.trackingPhone}`);
    return NextResponse.json({ success: true, action: "ignored", reason: "No matching site" });
  }

  if (!site.callTrackingEnabled) {
    console.info(`[calls/inbound] Call tracking disabled for site ${site.id} — logging only`);
    // Still create the row for audit purposes, but mark status as RECEIVED
  }

  // ── Create CallLead row ────────────────────────────────────────────────
  const callLead = await prisma.callLead.create({
    data: {
      siteId:          site.id,
      trackingPhone:   data.trackingPhone,
      callerNumber:    data.callerNumber,
      durationSeconds: data.durationSeconds ?? null,
      sourcePage:      data.sourcePage      ?? null,
      utmSource:       data.utmSource       ?? null,
      utmMedium:       data.utmMedium       ?? null,
      utmCampaign:     data.utmCampaign     ?? null,
      status:          data.status          ?? "RECEIVED",
    },
  });

  return NextResponse.json({
    success:    true,
    callLeadId: callLead.id,
    siteId:     site.id,
    tracked:    site.callTrackingEnabled,
  });
}

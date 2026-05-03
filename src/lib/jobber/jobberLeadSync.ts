// src/lib/jobber/jobberLeadSync.ts
// Orchestrates the full Jobber sync for a single lead:
//   1. Create client in Jobber
//   2. Create request in Jobber
//   3. Log every API call to JobberApiLog
//
// Returns a JobberSyncResult — never throws.
// The API route updates Lead status based on the result.

import { executeJobberGraphQL } from "./jobberClient";
import {
  CLIENT_CREATE_MUTATION,
  REQUEST_CREATE_MUTATION,
  MUTATIONS_VERIFIED,
  type ClientCreateInput,
  type ClientCreateResponse,
  type RequestCreateInput,
  type RequestCreateResponse,
} from "./jobberMutations";
import { logJobberCall } from "@/lib/db/jobberApiLog";
import { getActiveJobberConnection } from "@/lib/db/jobberConnections";
import type { LeadRecord, JobberSyncResult } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullName,
    lastName:  parts.slice(1).join(" ") || "-",
  };
}

/**
 * Build the internal notes string attached to the Jobber request.
 * Includes all attribution data so the Jobber user can see exactly
 * where this lead came from.
 */
function buildJobberNotes(lead: LeadRecord): string {
  const lines = [
    `Service: ${lead.service}`,
    `Urgency: ${lead.urgency}`,
    lead.notes ? `Customer Notes: ${lead.notes}` : null,
    "─────────────────────────────────",
    `Source: ${lead.sourceLabel}`,
    `Landing Page: ${lead.landingPageUrl}`,
    lead.referrer       ? `Referrer: ${lead.referrer}`             : null,
    lead.utmSource      ? `UTM Source: ${lead.utmSource}`          : null,
    lead.utmMedium      ? `UTM Medium: ${lead.utmMedium}`          : null,
    lead.utmCampaign    ? `UTM Campaign: ${lead.utmCampaign}`      : null,
    lead.utmTerm        ? `UTM Term: ${lead.utmTerm}`              : null,
    lead.utmContent     ? `UTM Content: ${lead.utmContent}`        : null,
    lead.gclid          ? `Google Click ID: ${lead.gclid}`         : null,
    lead.fbclid         ? `Facebook Click ID: ${lead.fbclid}`      : null,
    "─────────────────────────────────",
    `Lead ID: ${lead.id}`,
    `Submitted: ${new Date(lead.createdAt).toLocaleString("en-US", {
      timeZone: "America/Boise",
    })} MT`,
  ];

  return lines.filter(Boolean).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SYNC FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function syncLeadToJobber(
  lead: LeadRecord,
  siteId: string
): Promise<JobberSyncResult> {
  // Guard: skip API calls until mutations are verified in Jobber GraphiQL.
  // Lead is already saved to DB. Set MUTATIONS_VERIFIED = true in
  // jobberMutations.ts after running the introspection steps in that file.
  if (!MUTATIONS_VERIFIED) {
    await logJobberCall({
      leadId:       lead.id,
      operation:    "syncLeadToJobber",
      status:       "SKIPPED",
      errorMessage: "MUTATIONS_VERIFIED = false — Jobber sync skipped until GraphQL mutations are confirmed. See src/lib/jobber/jobberMutations.ts for instructions.",
    });
    return {
      status: "SKIPPED",
      error:  "Jobber mutations not yet verified. Lead saved to database. Set MUTATIONS_VERIFIED = true in jobberMutations.ts after GraphiQL verification.",
    };
  }

  // Check connection exists before attempting
  const connection = await getActiveJobberConnection(siteId);
  if (!connection) {
    await logJobberCall({
      leadId:       lead.id,
      operation:    "syncLeadToJobber",
      status:       "SKIPPED",
      errorMessage: `No active Jobber connection for site ${siteId}`,
    });
    return { status: "SKIPPED", error: "Jobber not connected for this site" };
  }

  // ── Step 1: Create Client ───────────────────────────────────────────────
  const { firstName, lastName } = parseName(lead.name);

  const clientInput: ClientCreateInput = {
    firstName,
    lastName,
    phones:  [{ number: lead.phone, primary: true }],
    emails:  [{ address: lead.email, primary: true }],
    billingAddress: {
      street1:  lead.address,
      city:     "Boise",   // TODO: parse from address or use site.city
      province: "ID",
      country:  "US",
    },
  };

  const clientResult = await executeJobberGraphQL<ClientCreateResponse>(
    siteId,
    CLIENT_CREATE_MUTATION,
    { input: clientInput }
  );

  await logJobberCall({
    leadId:       lead.id,
    operation:    "createClient",
    status:       clientResult.errors ? "ERROR" : "SUCCESS",
    durationMs:   clientResult.durationMs,
    httpStatus:   clientResult.httpStatus,
    requestBody:  { ...clientInput, email: "[REDACTED]", phone: "[REDACTED]" },
    responseBody: clientResult.rawResponse,
    errorMessage: clientResult.errors?.join("; "),
  });

  if (clientResult.errors) {
    return { status: "ERROR", error: clientResult.errors.join("; ") };
  }

  const clientId = clientResult.data?.clientCreate?.client?.id;
  if (!clientId) {
    const err = "Jobber clientCreate returned no client ID";
    return { status: "ERROR", error: err };
  }

  // Check for Jobber userErrors
  const clientUserErrors = clientResult.data?.clientCreate?.userErrors ?? [];
  if (clientUserErrors.length > 0) {
    const err = clientUserErrors.map((e) => e.message).join("; ");
    return { status: "ERROR", error: `Client userErrors: ${err}` };
  }

  // ── Step 2: Create Request ──────────────────────────────────────────────
  const requestInput: RequestCreateInput = {
    clientId,
    title:        buildRequestTitle(lead),
    instructions: buildJobberNotes(lead),
    propertyAddress: {
      street1:  lead.address,
      city:     "Boise",
      province: "ID",
      country:  "US",
    },
  };

  const requestResult = await executeJobberGraphQL<RequestCreateResponse>(
    siteId,
    REQUEST_CREATE_MUTATION,
    { input: requestInput }
  );

  await logJobberCall({
    leadId:       lead.id,
    operation:    "createRequest",
    status:       requestResult.errors ? "ERROR" : "SUCCESS",
    durationMs:   requestResult.durationMs,
    httpStatus:   requestResult.httpStatus,
    requestBody:  requestInput,
    responseBody: requestResult.rawResponse,
    errorMessage: requestResult.errors?.join("; "),
  });

  if (requestResult.errors) {
    return {
      status:   "ERROR",
      clientId,
      error:    requestResult.errors.join("; "),
    };
  }

  const requestId = requestResult.data?.requestCreate?.request?.id;
  if (!requestId) {
    return { status: "ERROR", clientId, error: "requestCreate returned no request ID" };
  }

  const requestUserErrors = requestResult.data?.requestCreate?.userErrors ?? [];
  if (requestUserErrors.length > 0) {
    const err = requestUserErrors.map((e) => e.message).join("; ");
    return { status: "ERROR", clientId, error: `Request userErrors: ${err}` };
  }

  return { status: "SUCCESS", clientId, requestId };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildRequestTitle(lead: LeadRecord): string {
  const urgencyPrefix =
    lead.urgency === "EMERGENCY" ? "🚨 EMERGENCY — " :
    lead.urgency === "URGENT"    ? "⚡ URGENT — "    : "";

  const serviceLabel = lead.service
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${urgencyPrefix}${serviceLabel}`;
}

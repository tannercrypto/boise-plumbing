// src/lib/db/leads.ts

import { prisma } from "./client";
import type { LeadStatus, LeadSubmissionPayload, JobberSyncStatus } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  siteId: string;
  clientId: string;
  payload: LeadSubmissionPayload;
  ipAddress?: string;
  userAgent?: string;
  sourceLabel: string;
  routeUsed?: string;
}

export async function createLead(input: CreateLeadInput) {
  const { siteId, clientId, payload, ipAddress, userAgent, sourceLabel, routeUsed } = input;
  const { attribution } = payload;

  return prisma.lead.create({
    data: {
      siteId,
      clientId,
      name:    payload.name,
      phone:   payload.phone,
      email:   payload.email,
      address: payload.address,
      service: payload.service,
      urgency: payload.urgency,
      notes:   payload.notes ?? null,

      sourceLabel,
      landingPageUrl: attribution.landingPageUrl,
      referrer:       attribution.referrer    ?? null,
      ipAddress:      ipAddress               ?? null,
      userAgent:      userAgent               ?? null,

      utmSource:   attribution.utmSource   ?? null,
      utmMedium:   attribution.utmMedium   ?? null,
      utmCampaign: attribution.utmCampaign ?? null,
      utmTerm:     attribution.utmTerm     ?? null,
      utmContent:  attribution.utmContent  ?? null,
      gclid:       attribution.gclid       ?? null,
      fbclid:      attribution.fbclid      ?? null,

      status:           "NEW",
      jobberSyncStatus: "PENDING",
      routeUsed:        routeUsed ?? null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBBER SYNC UPDATES
// ─────────────────────────────────────────────────────────────────────────────

export async function markLeadJobberSuccess(
  leadId: string,
  jobberClientId: string,
  jobberRequestId: string
) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      jobberClientId,
      jobberRequestId,
      jobberSyncStatus: "SUCCESS",
      jobberSyncedAt:   new Date(),
      jobberError:      null,
      status:           "SUBMITTED_TO_JOBBER",
    },
  });
}

export async function markLeadJobberError(leadId: string, error: string) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      jobberSyncStatus: "ERROR",
      jobberError:      error,
      status:           "JOBBER_ERROR",
    },
  });
}

export async function markLeadJobberSkipped(leadId: string) {
  return prisma.lead.update({
    where: { id: leadId },
    data: { jobberSyncStatus: "SKIPPED" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  return prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeads(options?: {
  siteId?: string;
  limit?: number;
  offset?: number;
  status?: LeadStatus;
  jobberSyncStatus?: JobberSyncStatus;
}) {
  const where = {
    ...(options?.siteId ? { siteId: options.siteId } : {}),
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.jobberSyncStatus
      ? { jobberSyncStatus: options.jobberSyncStatus }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { site: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take:    options?.limit  ?? 50,
      skip:    options?.offset ?? 0,
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total };
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      site:         { select: { name: true, slug: true } },
      client:       true,
      jobberApiLogs: { orderBy: { createdAt: "desc" } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBBER RETRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reset a lead's Jobber sync fields so it can be retried.
 * Clears the error, sets syncStatus back to PENDING, resets lead status to NEW.
 */
export async function resetLeadForJobberRetry(leadId: string) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      jobberSyncStatus: "PENDING",
      jobberError:      null,
      jobberClientId:   null,
      jobberRequestId:  null,
      jobberSyncedAt:   null,
      status:           "NEW",
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES (used by page components for callback annotations)
// ─────────────────────────────────────────────────────────────────────────────
export type LeadWithSite = Awaited<ReturnType<typeof getLeads>>["leads"][number];
export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadById>>>;

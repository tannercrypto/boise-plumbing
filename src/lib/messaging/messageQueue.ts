// src/lib/messaging/messageQueue.ts
// Message queue operations — enqueue messages for delivery via the bridge,
// and expose read/update functions for the bridge endpoints.
//
// Architecture:
//   1. Lead arrives → routing decision includes SMS
//   2. enqueueLeadMessages() creates MessageLog rows (status: QUEUED)
//   3. Bridge polls GET /api/messages/queue → reads QUEUED rows
//   4. Bridge sends via macOS Messages → POST /api/messages/:id/mark-sent
//   5. On failure → POST /api/messages/:id/mark-failed
//
// SPAM PREVENTION:
//   - Messages are ONLY queued for leads that opted in by submitting a form
//     or calling the tracking number (explicit contact request).
//   - Customer-facing SMS always include opt-out language (see smsTemplates.ts).
//   - Operator notifications go to the business owner — no opt-out required.

import { prisma } from "@/lib/db/client";
import {
  buildOperatorMessage,
  buildCustomerMessage,
} from "./smsTemplates";
import type { LeadRecord, TemplateContext, QueuedMessage } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// ENQUEUE MESSAGES FOR A LEAD
// ─────────────────────────────────────────────────────────────────────────────

export interface EnqueueOptions {
  lead:             LeadRecord;
  siteId:           string;
  siteName:         string;
  recipientPhones:  string[];   // operator phone(s) that receive the notification
  customTemplate?:  string;     // override default operator template
  clientId?:        string;
  templateId?:      string;
}

/**
 * Enqueue operator notification messages for a lead.
 * One MessageLog row per recipient phone number.
 * Does NOT send customer-facing SMS unless explicitly called with customer flag.
 */
export async function enqueueLeadMessages(options: EnqueueOptions): Promise<void> {
  const { lead, siteId, siteName, recipientPhones, clientId, templateId, customTemplate } = options;

  if (recipientPhones.length === 0) return;

  const context: TemplateContext = {
    name:    lead.name,
    phone:   lead.phone,
    service: lead.service.replace(/-/g, " "),
    urgency: lead.urgency,
    address: lead.address,
    site:    siteName,
  };

  const messageBody = buildOperatorMessage(context, customTemplate);

  await Promise.all(
    recipientPhones.map((phone) =>
      prisma.messageLog.create({
        data: {
          leadId:         lead.id,
          clientId:       clientId ?? null,
          siteId,
          templateId:     templateId ?? null,
          recipientPhone: normalizePhone(phone),
          messageBody,
          deliveryMethod: "MAC_LOCAL",
          status:         "QUEUED",
        },
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE READ (for bridge)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all QUEUED messages, oldest first.
 * Bridge polls this endpoint every 10–30 seconds.
 * Limit to 20 per poll to avoid overwhelming the bridge.
 */
export async function getQueuedMessages(limit = 20): Promise<QueuedMessage[]> {
  const rows = await prisma.messageLog.findMany({
    where:   { status: "QUEUED", deliveryMethod: "MAC_LOCAL" },
    orderBy: { createdAt: "asc" },
    take:    limit,
    select: {
      id:             true,
      recipientPhone: true,
      messageBody:    true,
      leadId:         true,
      siteId:         true,
      createdAt:      true,
    },
  });

  return rows.map((r: typeof rows[number]) => ({
    id:             r.id,
    recipientPhone: r.recipientPhone,
    messageBody:    r.messageBody,
    leadId:         r.leadId,
    siteId:         r.siteId,
    createdAt:      r.createdAt.toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK SENT / FAILED
// ─────────────────────────────────────────────────────────────────────────────

export async function markMessageSent(messageId: string): Promise<boolean> {
  try {
    await prisma.messageLog.update({
      where: { id: messageId },
      data:  { status: "SENT", sentAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export async function markMessageFailed(
  messageId:    string,
  errorMessage: string
): Promise<boolean> {
  try {
    await prisma.messageLog.update({
      where: { id: messageId },
      data:  { status: "FAILED", errorMessage },
    });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize phone to E.164 digits only (no formatting).
 * Example: "(208) 555-0100" → "12085550100"
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Add US country code if 10 digits and doesn't start with 1
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

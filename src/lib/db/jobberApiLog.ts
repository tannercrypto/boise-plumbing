// src/lib/db/jobberApiLog.ts
// Write JobberApiLog records for every outbound Jobber API call.
// Never throws — logging must not break the lead submission flow.

import { prisma } from "./client";
import type { JobberApiStatus } from "@/types";

export interface LogJobberCallInput {
  leadId?: string;
  operation: string;
  status: JobberApiStatus;
  durationMs?: number;
  requestBody?: unknown;      // will be sanitized before storage
  responseBody?: unknown;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Sanitize a request body before storage — strip any token-like fields.
 */
function sanitizeForLog(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  try {
    const str = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    // Redact anything that looks like a bearer token
    return str.replace(/(Bearer\s+)[^\s"]+/gi, "$1[REDACTED]");
  } catch {
    return "[unserializable]";
  }
}

export async function logJobberCall(input: LogJobberCallInput): Promise<void> {
  try {
    await prisma.jobberApiLog.create({
      data: {
        leadId:       input.leadId       ?? null,
        operation:    input.operation,
        status:       input.status,
        durationMs:   input.durationMs   ?? null,
        requestBody:  sanitizeForLog(input.requestBody)  ?? null,
        responseBody: sanitizeForLog(input.responseBody) ?? null,
        errorMessage: input.errorMessage ?? null,
        httpStatus:   input.httpStatus   ?? null,
      },
    });
  } catch (err) {
    // Log to stdout but do NOT throw — logging must never block the lead flow
    console.error("[JobberApiLog] Failed to write log entry:", err);
  }
}

export async function getLogsForLead(leadId: string) {
  return prisma.jobberApiLog.findMany({
    where:   { leadId },
    orderBy: { createdAt: "desc" },
  });
}

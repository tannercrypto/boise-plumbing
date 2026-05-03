// src/lib/jobber/jobberClient.ts
// Low-level Jobber GraphQL executor.
// Handles auth, HTTP, timing, and raw error extraction.
// Does NOT log to DB — callers do that via logJobberCall().

import { getValidAccessToken } from "./jobberTokenRefresh";
import type { JobberGraphQLResponse } from "@/types";

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

export interface JobberRequestResult<T> {
  data: T | null;
  errors: string[] | null;
  httpStatus: number;
  durationMs: number;
  rawResponse: string;
}

/**
 * Execute a GraphQL operation against the Jobber API.
 *
 * Returns a structured result object instead of throwing, so the caller
 * (jobberLeadSync.ts) can log both success and failure paths to JobberApiLog.
 */
export async function executeJobberGraphQL<T = unknown>(
  siteId: string,
  operation: string,
  variables?: Record<string, unknown>
): Promise<JobberRequestResult<T>> {
  const startMs = Date.now();
  let httpStatus = 0;
  let rawResponse = "";

  try {
    const accessToken = await getValidAccessToken(siteId);

    const response = await fetch(JOBBER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${accessToken}`,
        // ⚠️  Check Jobber developer docs for the current version string
        "X-JOBBER-GRAPHQL-VERSION":
          process.env.JOBBER_API_VERSION ?? "2024-11-15",
      },
      body: JSON.stringify({
        query:     operation,
        variables: variables ?? {},
      }),
    });

    httpStatus    = response.status;
    rawResponse   = await response.text();
    const durationMs = Date.now() - startMs;

    if (!response.ok) {
      return {
        data:        null,
        errors:      [`HTTP ${httpStatus}: ${rawResponse}`],
        httpStatus,
        durationMs,
        rawResponse,
      };
    }

    let parsed: JobberGraphQLResponse<T>;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return {
        data:        null,
        errors:      ["Failed to parse Jobber response as JSON"],
        httpStatus,
        durationMs,
        rawResponse,
      };
    }

    const errors = parsed.errors?.map((e) => e.message) ?? null;

    return {
      data:        parsed.data ?? null,
      errors:      errors && errors.length > 0 ? errors : null,
      httpStatus,
      durationMs,
      rawResponse,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      data:        null,
      errors:      [message],
      httpStatus,
      durationMs:  Date.now() - startMs,
      rawResponse,
    };
  }
}

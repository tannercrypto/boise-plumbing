// src/lib/db/jobberConnections.ts
// Per-site Jobber OAuth token storage.
// Each site in the portfolio has its own JobberConnection record.

import { prisma } from "./client";
import type { JobberTokenResponse } from "@/types";

export async function saveJobberConnection(
  siteId: string,
  tokens: JobberTokenResponse
) {
  // Deactivate existing connections for this site
  await prisma.jobberConnection.updateMany({
    where: { siteId, isActive: true },
    data:  { isActive: false },
  });

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return prisma.jobberConnection.create({
    data: {
      siteId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tokenType:    tokens.token_type,
      scope:        tokens.scope ?? null,
      isActive:     true,
    },
  });
}

export async function getActiveJobberConnection(siteId: string) {
  return prisma.jobberConnection.findFirst({
    where:   { siteId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateJobberConnection(
  connectionId: string,
  tokens: JobberTokenResponse
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return prisma.jobberConnection.update({
    where: { id: connectionId },
    data: {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope:        tokens.scope ?? null,
    },
  });
}

export function isConnectionExpired(expiresAt: Date): boolean {
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry
  return new Date(expiresAt.getTime() - bufferMs) < new Date();
}

// src/lib/db/revenue.ts
// Revenue management DB operations for Phase 4.
// When confirmedJobValue changes, recomputes today's AssetSnapshot for the site.

import { prisma } from "./client";
import type { RevenueUpdatePayload } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// LEAD REVENUE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLeadRevenue(
  leadId: string,
  payload: RevenueUpdatePayload
) {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      estimatedJobValue: payload.estimatedJobValue ?? undefined,
      confirmedJobValue: payload.confirmedJobValue ?? undefined,
      revenueSource:     payload.revenueSource     ?? undefined,
      commissionAmount:  payload.commissionAmount  ?? undefined,
    },
  });

  // When confirmedJobValue changes, kick off snapshot recalculation for the site.
  // Runs in background — failure must not fail the API response.
  if (payload.confirmedJobValue !== undefined) {
    recomputeSnapshotBackground(lead.siteId).catch((err) => {
      console.error("[revenue] Snapshot recompute failed:", err);
    });
  }

  return lead;
}

async function recomputeSnapshotBackground(siteId: string): Promise<void> {
  // Dynamic import to avoid circular deps (assetSnapshot imports prisma too)
  const { computeSiteSnapshot } = await import("@/lib/analytics/assetSnapshot");
  await computeSiteSnapshot(siteId);
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function getPortfolioStats() {
  const thirtyAgo = new Date();
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 30);
  thirtyAgo.setUTCHours(0, 0, 0, 0);

  const [
    totalSites,
    totalLeads30d,
    revenueAgg,
    leadsBySite,
    alertsBySite,
    jobberCounts,
  ] = await Promise.all([
    prisma.site.count({ where: { isActive: true } }),

    prisma.lead.count({ where: { createdAt: { gte: thirtyAgo } } }),

    prisma.lead.aggregate({
      where:  { createdAt: { gte: thirtyAgo } },
      _sum:   { confirmedJobValue: true },
    }),

    // Leads per site in 30d (for top site)
    prisma.lead.groupBy({
      by:      ["siteId"],
      where:   { createdAt: { gte: thirtyAgo } },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    1,
    }),

    // Sites with unread alerts
    prisma.alert.groupBy({
      by:      ["siteId"],
      where:   { isRead: false },
      _count:  { id: true },
    }),

    // Jobber sync health in 30d
    prisma.lead.groupBy({
      by:     ["jobberSyncStatus"],
      where:  { createdAt: { gte: thirtyAgo }, jobberSyncStatus: { in: ["SUCCESS", "ERROR"] } },
      _count: { id: true },
    }),
  ]);

  // Resolve top site name
  let topSite: { name: string; slug: string; leads30d: number } | null = null;
  if (leadsBySite.length > 0) {
    const topSiteRow = leadsBySite[0];
    const site = await prisma.site.findUnique({
      where:  { id: topSiteRow.siteId },
      select: { name: true, slug: true },
    });
    if (site) {
      topSite = { name: site.name, slug: site.slug, leads30d: topSiteRow._count.id };
    }
  }

  // Resolve alert site names
  const sitesWithAlerts = await Promise.all(
    alertsBySite.map(async (row: typeof alertsBySite[number]) => {
      const site = await prisma.site.findUnique({
        where:  { id: row.siteId },
        select: { name: true, slug: true },
      });
      return {
        name:       site?.name ?? row.siteId,
        slug:       site?.slug ?? row.siteId,
        alertCount: row._count.id,
      };
    })
  );

  // Jobber health
  const successCount = jobberCounts.find((r: typeof jobberCounts[number]) => r.jobberSyncStatus === "SUCCESS")?._count.id ?? 0;
  const errorCount   = jobberCounts.find((r: typeof jobberCounts[number]) => r.jobberSyncStatus === "ERROR")?._count.id   ?? 0;
  const totalAttempts = successCount + errorCount;

  return {
    totalSites,
    totalLeads30d,
    totalConfirmedRevenue30d: revenueAgg._sum.confirmedJobValue ?? 0,
    topSite,
    sitesWithAlerts,
    jobberSyncHealth: {
      successRate:    totalAttempts > 0 ? successCount / totalAttempts : 0,
      totalAttempts,
    },
  };
}

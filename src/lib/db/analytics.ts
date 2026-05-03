// src/lib/db/analytics.ts
// All read queries for Phase 3 analytics dashboards.
// Kept separate from leads.ts / sites.ts to maintain clear boundaries.

import { prisma } from "./client";
import type {
  SiteAnalyticsSummary,
  KeywordMovementRow,
  AlertRecord,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function daysAgoUtc(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// SITE ANALYTICS SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function getSiteAnalyticsSummary(
  siteId: string
): Promise<SiteAnalyticsSummary> {
  const thirtyAgo = daysAgoUtc(30);

  const [
    site,
    totalLeads,
    leadsByPageRaw,
    leadsByServiceRaw,
    leadsBySourceRaw,
    jobberStats,
    gscProperty,
  ] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.lead.count({ where: { siteId, createdAt: { gte: thirtyAgo } } }),

    // Leads grouped by landing page
    prisma.lead.groupBy({
      by:      ["landingPageUrl"],
      where:   { siteId, createdAt: { gte: thirtyAgo } },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    10,
    }),

    // Leads grouped by service
    prisma.lead.groupBy({
      by:      ["service"],
      where:   { siteId, createdAt: { gte: thirtyAgo } },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Leads grouped by UTM source (null = organic/direct)
    prisma.lead.groupBy({
      by:      ["utmSource"],
      where:   { siteId, createdAt: { gte: thirtyAgo } },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    10,
    }),

    // Jobber sync success rate
    prisma.lead.groupBy({
      by:     ["jobberSyncStatus"],
      where:  { siteId, createdAt: { gte: thirtyAgo }, jobberSyncStatus: { in: ["SUCCESS", "ERROR"] } },
      _count: { id: true },
    }),

    prisma.gscProperty.findUnique({ where: { siteId } }),
  ]);

  // Revenue
  const revenueAgg = await prisma.lead.aggregate({
    where:  { siteId, createdAt: { gte: thirtyAgo } },
    _sum:   { estimatedJobValue: true, confirmedJobValue: true },
  });

  // Jobber success rate
  const successCount = jobberStats.find((r: typeof jobberStats[number]) => r.jobberSyncStatus === "SUCCESS")?._count.id ?? 0;
  const errorCount   = jobberStats.find((r: typeof jobberStats[number]) => r.jobberSyncStatus === "ERROR")?._count.id ?? 0;
  const jobberSuccessRate =
    successCount + errorCount > 0 ? successCount / (successCount + errorCount) : 0;

  // GSC metrics
  let organicClicks30d = 0;
  let impressions30d   = 0;
  let avgCtr30d        = 0;
  let avgPosition30d   = 0;
  let clicksTrend:      Array<{ date: string; clicks: number }>      = [];
  let impressionsTrend: Array<{ date: string; impressions: number }> = [];
  let ctrTrend:         Array<{ date: string; ctr: number }>         = [];

  if (gscProperty) {
    const [gscAgg, gscDailyTrend] = await Promise.all([
      prisma.gscDailyMetric.aggregate({
        where: {
          propertyId: gscProperty.id,
          date:       { gte: thirtyAgo },
          page:       { not: null },
          query:      null,
        },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, gscAvgPosition: true },
      }),
      // Daily trend for charts — page-level, last 30 days
      prisma.gscDailyMetric.findMany({
        where: {
          propertyId: gscProperty.id,
          date:       { gte: thirtyAgo },
          page:       null,
          query:      null,
        },
        select: { date: true, clicks: true, impressions: true, ctr: true },
        orderBy: { date: "asc" },
      }),
    ]);

    organicClicks30d = gscAgg._sum.clicks      ?? 0;
    impressions30d   = gscAgg._sum.impressions  ?? 0;
    avgCtr30d        = gscAgg._avg.ctr          ?? 0;
    avgPosition30d   = gscAgg._avg.gscAvgPosition ?? 0;

    clicksTrend      = gscDailyTrend.map((r: typeof gscDailyTrend[number]) => ({ date: r.date.toISOString().split("T")[0], clicks: r.clicks }));
    impressionsTrend = gscDailyTrend.map((r: typeof gscDailyTrend[number]) => ({ date: r.date.toISOString().split("T")[0], impressions: r.impressions }));
    ctrTrend         = gscDailyTrend.map((r: typeof gscDailyTrend[number]) => ({ date: r.date.toISOString().split("T")[0], ctr: r.ctr }));
  }

  return {
    siteId,
    siteName:        site?.name ?? siteId,
    totalLeads,
    leadsByPage:     leadsByPageRaw.map((r: typeof leadsByPageRaw[number]) => ({ page: r.landingPageUrl, count: r._count.id })),
    leadsByService:  leadsByServiceRaw.map((r: typeof leadsByServiceRaw[number]) => ({ service: r.service, count: r._count.id })),
    leadsBySource:   leadsBySourceRaw.map((r: typeof leadsBySourceRaw[number]) => ({
      source: r.utmSource ?? "organic / direct",
      count:  r._count.id,
    })),
    jobberSuccessRate,
    organicClicks30d,
    impressions30d,
    avgCtr30d,
    avgPosition30d,
    clicksTrend,
    impressionsTrend,
    ctrTrend,
    estimatedRevenue30d: revenueAgg._sum.estimatedJobValue ?? 0,
    confirmedRevenue30d: revenueAgg._sum.confirmedJobValue ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORD MOVEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function getKeywordMovement(
  siteId: string,
  limit = 50
): Promise<KeywordMovementRow[]> {
  const gscProperty = await prisma.gscProperty.findUnique({ where: { siteId } });
  if (!gscProperty) return [];

  const today   = daysAgoUtc(0);
  const d7      = daysAgoUtc(7);
  const d30     = daysAgoUtc(30);

  // Today's query positions
  const todayRows = await prisma.gscDailyMetric.findMany({
    where: {
      propertyId: gscProperty.id,
      date:       { gte: daysAgoUtc(2) },   // most recent 2 days (GSC lag)
      query:      { not: null },
      page:       null,
    },
    orderBy: { date: "desc" },
  });

  // Build a map of query → most recent position
  const latestByQuery = new Map<string, { position: number; clicks: number; impressions: number }>();
  for (const row of todayRows) {
    if (!row.query || latestByQuery.has(row.query)) continue;
    latestByQuery.set(row.query, {
      position:    row.gscAvgPosition,
      clicks:      row.clicks,
      impressions: row.impressions,
    });
  }

  // 7d and 30d averages
  const [rows7d, rows30d] = await Promise.all([
    prisma.gscDailyMetric.findMany({
      where: {
        propertyId: gscProperty.id,
        date:       { gte: d7, lt: today },
        query:      { not: null },
        page:       null,
      },
    }),
    prisma.gscDailyMetric.findMany({
      where: {
        propertyId: gscProperty.id,
        date:       { gte: d30, lt: d7 },
        query:      { not: null },
        page:       null,
      },
    }),
  ]);

  // Compute averages per query
  const avg = (rows: typeof rows7d, query: string, field: "gscAvgPosition") => {
    const matching = rows.filter((r: typeof rows[number]) => r.query === query);
    if (matching.length === 0) return null;
    return matching.reduce((s: number, r: typeof rows[number]) => s + r[field], 0) / matching.length;
  };

  const sumClicks = (rows: typeof rows30d, query: string) =>
    rows.filter((r: typeof rows[number]) => r.query === query).reduce((s: number, r: typeof rows[number]) => s + r.clicks, 0);

  const result: KeywordMovementRow[] = [];

  for (const [query, current] of latestByQuery) {
    const p7d  = avg([...rows7d], query, "gscAvgPosition");
    const p30d = avg([...rows30d], query, "gscAvgPosition");

    result.push({
      query,
      positionToday:  current.position,
      position7d:     p7d,
      position30d:    p30d,
      movementVs7d:   p7d !== null ? p7d - current.position : null,  // positive = improved
      clicks30d:      sumClicks([...rows7d, ...rows30d], query) + current.clicks,
      impressions30d: current.impressions,
    });
  }

  // Sort by clicks descending (most important keywords first)
  return result
    .sort((a, b) => b.clicks30d - a.clicks30d)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSET SNAPSHOTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getLatestSnapshot(siteId: string) {
  return prisma.assetSnapshot.findFirst({
    where:   { siteId },
    orderBy: { date: "desc" },
  });
}

export async function getSnapshotHistory(siteId: string, days = 30) {
  const since = daysAgoUtc(days);
  return prisma.assetSnapshot.findMany({
    where:   { siteId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadAlerts(siteId?: string): Promise<AlertRecord[]> {
  const alerts = await prisma.alert.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      isRead: false,
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take:    50,
  });

  return alerts.map((a: typeof alerts[number]) => ({
    id:         a.id,
    createdAt:  a.createdAt.toISOString(),
    siteId:     a.siteId,
    type:       a.type,
    severity:   a.severity,
    message:    a.message,
    metadata:   a.metadata as Record<string, unknown>,
    isRead:     a.isRead,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
  }));
}

export async function markAlertRead(alertId: string): Promise<void> {
  await prisma.alert.update({
    where: { id: alertId },
    data:  { isRead: true },
  });
}

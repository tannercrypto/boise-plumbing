// src/lib/db/reports.ts
// Safe report data queries for client-facing /reports pages.
// These functions MUST NOT expose internal fields:
//   ✗ asset valuation / multiples
//   ✗ margin assumptions
//   ✗ admin settings / OAuth tokens
//   ✗ internal notes or API logs
//   ✗ Jobber IDs or sync details
//   ✗ IP addresses or user agents

import { prisma } from "./client";
import type { ClientReportData } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT LOOKUP (for report auth)
// ─────────────────────────────────────────────────────────────────────────────

export async function getClientBySlug(clientSlug: string) {
  return prisma.client.findUnique({
    where:  { clientSlug },
    select: {
      id:          true,
      name:        true,
      clientSlug:  true,
      reportToken: true,
    },
  });
}

// All sites that have leads from this client (used for /reports/[clientSlug] index)
export async function getClientSites(clientId: string) {
  const leads = await prisma.lead.findMany({
    where:   { clientId },
    select:  { site: { select: { id: true, name: true, slug: true, domain: true } } },
    distinct: ["siteId"],
  });
  return leads.map((l: typeof leads[number]) => l.site);
}

// ─────────────────────────────────────────────────────────────────────────────
// SITE REPORT DATA
// Safe — returns only metrics clients are allowed to see
// ─────────────────────────────────────────────────────────────────────────────

export async function getSiteReportData(
  siteId:   string,
  clientId: string
): Promise<ClientReportData | null> {
  const thirtyAgo = new Date();
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 30);
  thirtyAgo.setUTCHours(0, 0, 0, 0);

  const site = await prisma.site.findUnique({
    where:  { id: siteId },
    select: { name: true, domain: true },
  });
  if (!site) return null;

  // ── Lead metrics for this client on this site ──────────────────────────
  const [totalLeads30d, bookedJobs30d, revenueAgg] = await Promise.all([
    prisma.lead.count({
      where: { siteId, clientId, createdAt: { gte: thirtyAgo } },
    }),
    prisma.lead.count({
      where: { siteId, clientId, status: "BOOKED", updatedAt: { gte: thirtyAgo } },
    }),
    prisma.lead.aggregate({
      where:  { siteId, clientId, createdAt: { gte: thirtyAgo } },
      _sum:   { estimatedJobValue: true, confirmedJobValue: true },
    }),
  ]);

  // ── GSC data (site-wide, not client-specific — clients see site performance) ──
  const gscProperty = await prisma.gscProperty.findUnique({ where: { siteId } });

  let organicClicks30d  = 0;
  let impressions30d    = 0;
  let avgPosition30d    = 0;
  let avgCtr30d         = 0;
  let positionTrend:    Array<{ date: string; position: number }> = [];
  let topPages:         Array<{ page: string; clicks: number }>   = [];
  let topQueries:       Array<{ query: string; clicks: number; position: number }> = [];

  if (gscProperty) {
    const [gscAgg, dailyRows, pageRows, queryRows] = await Promise.all([
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

      // Daily position trend
      prisma.gscDailyMetric.findMany({
        where: {
          propertyId: gscProperty.id,
          date:       { gte: thirtyAgo },
          page:       null,
          query:      null,
        },
        select:  { date: true, gscAvgPosition: true },
        orderBy: { date: "asc" },
      }),

      // Top pages by clicks
      prisma.gscDailyMetric.groupBy({
        by:      ["page"],
        where:   { propertyId: gscProperty.id, date: { gte: thirtyAgo }, page: { not: null }, query: null },
        _sum:    { clicks: true },
        orderBy: { _sum: { clicks: "desc" } },
        take:    10,
      }),

      // Top queries by clicks
      prisma.gscDailyMetric.groupBy({
        by:      ["query"],
        where:   { propertyId: gscProperty.id, date: { gte: thirtyAgo }, query: { not: null }, page: null },
        _sum:    { clicks: true },
        _avg:    { gscAvgPosition: true },
        orderBy: { _sum: { clicks: "desc" } },
        take:    20,
      }),
    ]);

    organicClicks30d = gscAgg._sum.clicks          ?? 0;
    impressions30d   = gscAgg._sum.impressions      ?? 0;
    avgCtr30d        = gscAgg._avg.ctr              ?? 0;
    avgPosition30d   = gscAgg._avg.gscAvgPosition   ?? 0;

    positionTrend = dailyRows.map((r: typeof dailyRows[number]) => ({
      date:     r.date.toISOString().split("T")[0],
      position: r.gscAvgPosition,
    }));

    topPages = pageRows
      .filter((r: typeof pageRows[number]) => r.page)
      .map((r: typeof pageRows[number]) => ({
        page:   r.page!,
        clicks: r._sum.clicks ?? 0,
      }));

    topQueries = queryRows
      .filter((r: typeof queryRows[number]) => r.query)
      .map((r: typeof queryRows[number]) => ({
        query:    r.query!,
        clicks:   r._sum.clicks         ?? 0,
        position: r._avg.gscAvgPosition ?? 0,
      }));
  }

  return {
    siteName:           site.name,
    domain:             site.domain,
    reportDate:         new Date().toISOString().split("T")[0],
    totalLeads30d,
    bookedJobs30d,
    estimatedRevenue30d: revenueAgg._sum.estimatedJobValue ?? 0,
    confirmedRevenue30d: revenueAgg._sum.confirmedJobValue ?? 0,
    organicClicks30d,
    impressions30d,
    avgPosition30d,
    avgCtr30d,
    positionTrend,
    topPages,
    topQueries,
  };
}

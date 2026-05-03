// src/lib/analytics/assetSnapshot.ts
// Computes and stores daily AssetSnapshot records for each active site.
// Called from: POST /api/cron/compute-snapshots
//
// Snapshot data is a 30-day rolling window computed at run time from:
//   - Lead table (leads, booked jobs, revenue)
//   - GscDailyMetric table (organic clicks, impressions)
//   - JobberApiLog / Lead.jobberSyncStatus (sync rate)

import { prisma } from "@/lib/db/client";

function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(n: number): Date {
  const d = todayUtc();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export interface SnapshotResult {
  siteId:  string;
  date:    string;
  success: boolean;
  error?:  string;
}

export async function computeSiteSnapshot(siteId: string): Promise<SnapshotResult> {
  const today      = todayUtc();
  const thirtyAgo  = daysAgoUtc(30);

  try {
    // ── Leads in last 30d ──────────────────────────────────────────────
    const leads30d = await prisma.lead.count({
      where: {
        siteId,
        createdAt: { gte: thirtyAgo },
      },
    });

    // ── Booked jobs in last 30d ────────────────────────────────────────
    const bookedJobs30d = await prisma.lead.count({
      where: {
        siteId,
        status:    "BOOKED",
        updatedAt: { gte: thirtyAgo },
      },
    });

    // ── Revenue in last 30d ────────────────────────────────────────────
    const revenueResult = await prisma.lead.aggregate({
      where:  { siteId, createdAt: { gte: thirtyAgo } },
      _sum:   {
        estimatedJobValue: true,
        confirmedJobValue: true,
      },
    });

    const estimatedRevenue30d = revenueResult._sum.estimatedJobValue ?? 0;
    const confirmedRevenue30d = revenueResult._sum.confirmedJobValue ?? 0;

    // ── GSC organic clicks + impressions in last 30d ───────────────────
    const gscProperty = await prisma.gscProperty.findUnique({
      where: { siteId },
    });

    let organicClicks30d  = 0;
    let impressions30d    = 0;

    if (gscProperty) {
      const gscAgg = await prisma.gscDailyMetric.aggregate({
        where: {
          propertyId: gscProperty.id,
          date:       { gte: thirtyAgo },
          page:       { not: null },    // page-level rows only (not query rows)
          query:      null,
        },
        _sum: {
          clicks:     true,
          impressions: true,
        },
      });
      organicClicks30d = gscAgg._sum.clicks     ?? 0;
      impressions30d   = gscAgg._sum.impressions ?? 0;
    }

    // ── Jobber sync rate ───────────────────────────────────────────────
    // Defined as: SUCCESS syncs / (SUCCESS + ERROR) leads in last 30d
    const [successCount, errorCount] = await Promise.all([
      prisma.lead.count({
        where: { siteId, createdAt: { gte: thirtyAgo }, jobberSyncStatus: "SUCCESS" },
      }),
      prisma.lead.count({
        where: { siteId, createdAt: { gte: thirtyAgo }, jobberSyncStatus: "ERROR" },
      }),
    ]);
    const syncDenominator = successCount + errorCount;
    const jobberSyncRate  = syncDenominator > 0
      ? successCount / syncDenominator
      : 0;

    // ── Upsert snapshot ────────────────────────────────────────────────
    await prisma.assetSnapshot.upsert({
      where:  { siteId_date: { siteId, date: today } },
      create: {
        siteId,
        date:                today,
        leads30d,
        bookedJobs30d,
        estimatedRevenue30d,
        confirmedRevenue30d,
        organicClicks30d,
        impressions30d,
        jobberSyncRate,
      },
      update: {
        leads30d,
        bookedJobs30d,
        estimatedRevenue30d,
        confirmedRevenue30d,
        organicClicks30d,
        impressions30d,
        jobberSyncRate,
      },
    });

    return { siteId, date: today.toISOString().split("T")[0], success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[assetSnapshot] Failed for site ${siteId}:`, message);
    return { siteId, date: today.toISOString().split("T")[0], success: false, error: message };
  }
}

export async function computeAllSiteSnapshots(): Promise<SnapshotResult[]> {
  const sites = await prisma.site.findMany({ where: { isActive: true } });
  return Promise.all(sites.map((s: typeof sites[number]) => computeSiteSnapshot(s.id)));
}

// src/lib/analytics/alertEngine.ts
// Compares today's AssetSnapshot against prior periods and writes Alert rows
// when thresholds are breached. Never throws — alert failures are logged only.
//
// Thresholds (all configurable here):
//   CLICKS_DROP:         organic clicks vs 7-day avg down > 25%
//   LEADS_DROP:          leads vs 7-day avg down > 25%
//   JOBBER_SYNC_FAILURES: jobberSyncRate < 0.75 (< 75% success)

import { prisma } from "@/lib/db/client";
import type { AlertType } from "@/types";
import type { Prisma } from "@prisma/client";

const THRESHOLDS = {
  CLICKS_DROP_PCT:      0.25,   // 25% drop triggers alert
  LEADS_DROP_PCT:       0.25,
  JOBBER_FAILURE_RATE:  0.25,   // alert if error rate > 25% (sync rate < 75%)
};

function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(n: number): Date {
  const d = todayUtc();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-SITE CHECK
// ─────────────────────────────────────────────────────────────────────────────

export async function checkAlertsForSite(siteId: string): Promise<void> {
  try {
    const today      = todayUtc();
    const sevenAgo   = daysAgoUtc(7);

    // Get today's snapshot
    const todaySnap = await prisma.assetSnapshot.findUnique({
      where: { siteId_date: { siteId, date: today } },
    });
    if (!todaySnap) return; // no snapshot yet — nothing to check

    // Get snapshots from 7 days ago for comparison
    const priorSnaps = await prisma.assetSnapshot.findMany({
      where: {
        siteId,
        date: { gte: sevenAgo, lt: today },
      },
      orderBy: { date: "asc" },
    });

    if (priorSnaps.length === 0) return; // not enough history yet

    const avgPriorClicks = priorSnaps.reduce((s: number, r: typeof priorSnaps[number]) => s + r.organicClicks30d, 0) / priorSnaps.length;
    const avgPriorLeads  = priorSnaps.reduce((s: number, r: typeof priorSnaps[number]) => s + r.leads30d, 0) / priorSnaps.length;

    // ── CLICKS_DROP ────────────────────────────────────────────────────
    if (avgPriorClicks > 0) {
      const drop = (avgPriorClicks - todaySnap.organicClicks30d) / avgPriorClicks;
      if (drop > THRESHOLDS.CLICKS_DROP_PCT) {
        await writeAlert({
          siteId,
          type:     "CLICKS_DROP",
          severity: drop > 0.5 ? "CRITICAL" : "WARNING",
          message:  `Organic clicks dropped ${Math.round(drop * 100)}% vs 7-day average (${Math.round(avgPriorClicks)} → ${todaySnap.organicClicks30d} / 30d)`,
          metadata: { todayClicks: todaySnap.organicClicks30d, avgPriorClicks, dropPct: drop } as Prisma.InputJsonValue,
        });
      }
    }

    // ── LEADS_DROP ─────────────────────────────────────────────────────
    if (avgPriorLeads > 0) {
      const drop = (avgPriorLeads - todaySnap.leads30d) / avgPriorLeads;
      if (drop > THRESHOLDS.LEADS_DROP_PCT) {
        await writeAlert({
          siteId,
          type:     "LEADS_DROP",
          severity: drop > 0.5 ? "CRITICAL" : "WARNING",
          message:  `Leads dropped ${Math.round(drop * 100)}% vs 7-day average (${Math.round(avgPriorLeads)} → ${todaySnap.leads30d} / 30d)`,
          metadata: { todayLeads: todaySnap.leads30d, avgPriorLeads, dropPct: drop } as Prisma.InputJsonValue,
        });
      }
    }

    // ── JOBBER_SYNC_FAILURES ───────────────────────────────────────────
    const errorRate = 1 - todaySnap.jobberSyncRate;
    if (errorRate > THRESHOLDS.JOBBER_FAILURE_RATE) {
      await writeAlert({
        siteId,
        type:     "JOBBER_SYNC_FAILURES",
        severity: errorRate > 0.5 ? "CRITICAL" : "WARNING",
        message:  `Jobber sync failure rate is ${Math.round(errorRate * 100)}% (success rate: ${Math.round(todaySnap.jobberSyncRate * 100)}%)`,
        metadata: { syncRate: todaySnap.jobberSyncRate, errorRate } as Prisma.InputJsonValue,
      });
    }
  } catch (err) {
    // Never throw — alert engine must not interrupt other cron steps
    console.error(`[alertEngine] Failed for site ${siteId}:`, err);
  }
}

export async function checkAllSiteAlerts(): Promise<void> {
  const sites = await prisma.site.findMany({ where: { isActive: true } });
  await Promise.all(sites.map((s: { id: string }) => checkAlertsForSite(s.id)));
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE ALERT (idempotent — one alert per type per site per day)
// ─────────────────────────────────────────────────────────────────────────────

interface WriteAlertInput {
  siteId:   string;
  type:     AlertType;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message:  string;
  metadata: Prisma.InputJsonValue;
}

async function writeAlert(input: WriteAlertInput): Promise<void> {
  const todayStart = todayUtc();
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

  // One alert per type per site per day — avoid spam
  const existing = await prisma.alert.findFirst({
    where: {
      siteId:    input.siteId,
      type:      input.type,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  });

  if (existing) {
    // Update message if severity escalated
    if (
      (input.severity === "CRITICAL" && existing.severity !== "CRITICAL") ||
      (input.severity === "WARNING"  && existing.severity === "INFO")
    ) {
      await prisma.alert.update({
        where: { id: existing.id },
        data:  { severity: input.severity, message: input.message, metadata: input.metadata },
      });
    }
    return;
  }

  await prisma.alert.create({
    data: {
      siteId:   input.siteId,
      type:     input.type,
      severity: input.severity,
      message:  input.message,
      metadata: input.metadata,
    },
  });
}

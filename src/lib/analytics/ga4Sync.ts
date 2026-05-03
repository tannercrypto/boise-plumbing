// src/lib/analytics/ga4Sync.ts
// Pulls GA4 daily metrics for all active properties and stores them.
// Called from: POST /api/cron/sync-analytics

import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import { fetchGa4DailyMetrics } from "./ga4Client";

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface Ga4SyncResult {
  ga4PropertyDbId: string;
  ga4PropertyId:   string;
  date:            string;
  success:         boolean;
  error?:          string;
}

export async function syncGa4Property(
  ga4PropertyDbId: string,
  date?: string
): Promise<Ga4SyncResult> {
  const targetDate = date ?? yesterday();

  const property = await prisma.ga4Property.findUnique({
    where: { id: ga4PropertyDbId },
  });

  if (!property || !property.isActive) {
    return {
      ga4PropertyDbId,
      ga4PropertyId: "",
      date: targetDate,
      success: false,
      error: "Property not found or inactive",
    };
  }

  try {
    const metrics = await fetchGa4DailyMetrics({
      ga4PropertyDbId: property.id,
      date:            targetDate,
    });

    if (!metrics) {
      // No data for this date — log but don't error
      return {
        ga4PropertyDbId: property.id,
        ga4PropertyId:   property.propertyId,
        date:            targetDate,
        success:         true,
      };
    }

    const dateObj = new Date(targetDate + "T00:00:00.000Z");

    await prisma.ga4DailyMetric.upsert({
      where: {
        ga4PropertyId_date: {
          ga4PropertyId: property.id,
          date:          dateObj,
        },
      },
      create: {
        ga4PropertyId:  property.id,
        date:           dateObj,
        users:          metrics.users,
        newUsers:       metrics.newUsers,
        sessions:       metrics.sessions,
        pageViews:      metrics.pageViews,
        formSubmits:    metrics.formSubmits,
        callClicks:     metrics.callClicks,
        trafficSources: metrics.trafficSources as unknown as Prisma.InputJsonValue,
      },
      update: {
        users:          metrics.users,
        newUsers:       metrics.newUsers,
        sessions:       metrics.sessions,
        pageViews:      metrics.pageViews,
        formSubmits:    metrics.formSubmits,
        callClicks:     metrics.callClicks,
        trafficSources: metrics.trafficSources as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.ga4Property.update({
      where: { id: property.id },
      data:  { lastSyncedAt: new Date() },
    });

    return {
      ga4PropertyDbId: property.id,
      ga4PropertyId:   property.propertyId,
      date:            targetDate,
      success:         true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ga4Sync] Failed for property ${ga4PropertyDbId}:`, message);
    return {
      ga4PropertyDbId,
      ga4PropertyId: property.propertyId,
      date:          targetDate,
      success:       false,
      error:         message,
    };
  }
}

export async function syncAllGa4Properties(date?: string): Promise<Ga4SyncResult[]> {
  const properties = await prisma.ga4Property.findMany({
    where: { isActive: true },
  });

  return Promise.all(
    properties.map((p: typeof properties[number]) => syncGa4Property(p.id, date))
  );
}

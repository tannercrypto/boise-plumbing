// src/lib/analytics/gscSync.ts
// Orchestrates pulling GSC data for all active properties and storing it.
// Called from the cron endpoint: POST /api/cron/sync-analytics
//
// Pull strategy:
//   - Default: fetch yesterday's data (GSC data is typically 2-3 days delayed;
//     we fetch yesterday and let it overwrite as data finalises)
//   - Backfill: callers can pass a specific date range

import { prisma } from "@/lib/db/client";
import { fetchGscQueriesForDate, fetchGscPagesForDate } from "./gscClient";

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toYmd(d: Date): string {
  return d.toISOString().split("T")[0];
}

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return toYmd(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC ONE PROPERTY
// ─────────────────────────────────────────────────────────────────────────────

export interface GscSyncResult {
  propertyId:    string;
  propertyUri:   string;
  date:          string;
  queryRows:     number;
  pageRows:      number;
  error?:        string;
}

export async function syncGscProperty(
  propertyId: string,
  date?: string
): Promise<GscSyncResult> {
  const targetDate = date ?? yesterday();

  const property = await prisma.gscProperty.findUnique({
    where: { id: propertyId },
  });

  if (!property || !property.isActive) {
    return {
      propertyId,
      propertyUri: "",
      date: targetDate,
      queryRows: 0,
      pageRows: 0,
      error: "Property not found or inactive",
    };
  }

  try {
    // ── Fetch query-level data ─────────────────────────────────────────
    const queryRows = await fetchGscQueriesForDate({
      propertyId:  property.id,
      propertyUri: property.propertyUri,
      date:        targetDate,
    });

    // ── Fetch page-level data ──────────────────────────────────────────
    const pageRows = await fetchGscPagesForDate({
      propertyId:  property.id,
      propertyUri: property.propertyUri,
      date:        targetDate,
    });

    const dateObj = new Date(targetDate + "T00:00:00.000Z");

    // ── Upsert query rows ──────────────────────────────────────────────
    for (const row of queryRows) {
      const query = row.keys[0] ?? null;
      await prisma.gscDailyMetric.upsert({
        where: {
          propertyId_date_page_query: {
            propertyId: property.id,
            date:       dateObj,
            page:       null as unknown as string,
            query:      query ?? "",
          },
        },
        create: {
          propertyId:     property.id,
          date:           dateObj,
          page:           null,
          query,
          clicks:         row.clicks,
          impressions:    row.impressions,
          ctr:            row.ctr,
          gscAvgPosition: row.position,
        },
        update: {
          clicks:         row.clicks,
          impressions:    row.impressions,
          ctr:            row.ctr,
          gscAvgPosition: row.position,
        },
      });
    }

    // ── Upsert page rows ───────────────────────────────────────────────
    for (const row of pageRows) {
      const page = row.keys[0] ?? null;
      await prisma.gscDailyMetric.upsert({
        where: {
          propertyId_date_page_query: {
            propertyId: property.id,
            date:       dateObj,
            page:       page ?? "",
            query:      null as unknown as string,
          },
        },
        create: {
          propertyId:     property.id,
          date:           dateObj,
          page,
          query:          null,
          clicks:         row.clicks,
          impressions:    row.impressions,
          ctr:            row.ctr,
          gscAvgPosition: row.position,
        },
        update: {
          clicks:         row.clicks,
          impressions:    row.impressions,
          ctr:            row.ctr,
          gscAvgPosition: row.position,
        },
      });
    }

    // Update lastSyncedAt
    await prisma.gscProperty.update({
      where: { id: property.id },
      data:  { lastSyncedAt: new Date() },
    });

    return {
      propertyId:  property.id,
      propertyUri: property.propertyUri,
      date:        targetDate,
      queryRows:   queryRows.length,
      pageRows:    pageRows.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[gscSync] Failed for property ${propertyId}:`, message);
    return {
      propertyId,
      propertyUri: property.propertyUri,
      date:        targetDate,
      queryRows:   0,
      pageRows:    0,
      error:       message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC ALL ACTIVE PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

export async function syncAllGscProperties(date?: string): Promise<GscSyncResult[]> {
  const properties = await prisma.gscProperty.findMany({
    where: { isActive: true },
  });

  return Promise.all(
    properties.map((p: typeof properties[number]) => syncGscProperty(p.id, date))
  );
}

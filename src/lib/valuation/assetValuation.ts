// src/lib/valuation/assetValuation.ts
// Pure asset valuation calculation — no DB access.
// Input: trailing 30-day snapshot data.
// Output: conservative / base / aggressive multiples.
//
// Profit basis priority:
//   1. confirmedCommission  (commissionAmount sum from confirmed leads)
//   2. estimatedCommission  (commissionAmount sum from estimated leads)
//   3. estimatedLeadValue   (estimatedJobValue sum)
//
// Monthly values are derived from the trailing 30-day window.
// Multiples: Conservative × 18, Base × 24, Aggressive × 36.

import type { AssetValuation } from "@/types";

export interface ValuationInput {
  // Trailing 30d revenue from AssetSnapshot or live query
  confirmedRevenue30d:  number;
  estimatedRevenue30d:  number;
  // Commission amounts (trailing 30d, derived from leads)
  confirmedCommission30d: number;
  estimatedCommission30d: number;
}

const DISCLAIMER =
  "Asset valuation is an estimate based on trailing lead and revenue performance. " +
  "It does not account for market conditions, contract terms, or future performance. " +
  "Consult a qualified business appraiser before any transaction.";

export function computeAssetValuation(input: ValuationInput): AssetValuation {
  let monthlyProfit: number;
  let profitBasis: AssetValuation["profitBasis"];

  if (input.confirmedCommission30d > 0) {
    monthlyProfit = input.confirmedCommission30d;
    profitBasis   = "confirmed_commission";
  } else if (input.estimatedCommission30d > 0) {
    monthlyProfit = input.estimatedCommission30d;
    profitBasis   = "estimated_commission";
  } else {
    // Fall back to a conservative 20% margin on estimated lead value
    monthlyProfit = input.estimatedRevenue30d * 0.20;
    profitBasis   = "estimated_lead_value";
  }

  // Ensure non-negative
  monthlyProfit = Math.max(0, monthlyProfit);

  return {
    monthlyProfit,
    profitBasis,
    conservative: monthlyProfit * 18,
    base:         monthlyProfit * 24,
    aggressive:   monthlyProfit * 36,
    disclaimer:   DISCLAIMER,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-BACKED HELPER
// Fetches commission data and calls computeAssetValuation.
// Kept separate from the pure function so the pure function stays testable.
// ─────────────────────────────────────────────────────────────────────────────

export async function computeSiteValuation(
  siteId: string,
  snapshot: {
    confirmedRevenue30d: number;
    estimatedRevenue30d: number;
  }
): Promise<AssetValuation> {
  const { prisma } = await import("@/lib/db/client");

  const thirtyAgo = new Date();
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 30);
  thirtyAgo.setUTCHours(0, 0, 0, 0);

  const commissionAgg = await prisma.lead.aggregate({
    where:  { siteId, createdAt: { gte: thirtyAgo } },
    _sum:   {
      commissionAmount:  true,
      estimatedJobValue: true,   // used when no commission set
    },
  });

  // Split commission into confirmed vs estimated
  const [confirmedCommAgg, estimatedCommAgg] = await Promise.all([
    prisma.lead.aggregate({
      where:  { siteId, createdAt: { gte: thirtyAgo }, confirmedJobValue: { not: null } },
      _sum:   { commissionAmount: true },
    }),
    prisma.lead.aggregate({
      where:  { siteId, createdAt: { gte: thirtyAgo }, confirmedJobValue: null, estimatedJobValue: { not: null } },
      _sum:   { commissionAmount: true },
    }),
  ]);

  return computeAssetValuation({
    confirmedRevenue30d:    snapshot.confirmedRevenue30d,
    estimatedRevenue30d:    snapshot.estimatedRevenue30d,
    confirmedCommission30d: confirmedCommAgg._sum.commissionAmount ?? 0,
    estimatedCommission30d: estimatedCommAgg._sum.commissionAmount ?? 0,
  });
}

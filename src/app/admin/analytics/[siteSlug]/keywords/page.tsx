// src/app/admin/analytics/[siteSlug]/keywords/page.tsx
// Keyword movement tracker: current position vs 7d and 30d ago.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSiteBySlug } from "@/lib/db/sites";
import { getKeywordMovement } from "@/lib/db/analytics";

export const metadata: Metadata = {
  title:  "Keyword Movement — Admin",
  robots: { index: false, follow: false },
};

export default async function KeywordsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const keywords = await getKeywordMovement(site.id, 100);

  return (
    <AdminShell activePath="/admin/analytics">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Back */}
        <Link
          href={`/admin/analytics/${siteSlug}`}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {site.name} Analytics
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Keyword Movement</h1>
          <p className="text-gray-500 text-sm mt-1">
            {site.domain} · GSC Average Position — not exact rank · {keywords.length} keywords tracked
          </p>
        </div>

        {keywords.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm mb-2">No keyword data yet.</p>
            <p className="text-gray-700 text-xs">
              Connect Google Search Console and wait for the first sync to complete.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    Query
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    Position Now
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    7d Ago
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    30d Ago
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    vs 7d
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    Clicks (30d)
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    Impressions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {keywords.map((kw) => {
                  const movement = kw.movementVs7d;
                  // In GSC, lower position number = better rank
                  // Positive movementVs7d means old was higher number = we improved
                  const improved  = movement !== null && movement > 0.5;
                  const declined  = movement !== null && movement < -0.5;
                  const flat      = movement !== null && !improved && !declined;

                  return (
                    <tr key={kw.query} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5 text-gray-300 max-w-xs">
                        <span className="truncate block" title={kw.query}>
                          {kw.query}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-white font-semibold">
                          {kw.positionToday.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {kw.position7d !== null ? kw.position7d.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {kw.position30d !== null ? kw.position30d.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {movement === null ? (
                          <span className="text-gray-700">—</span>
                        ) : improved ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{movement.toFixed(1)}
                          </span>
                        ) : declined ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {movement.toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-500 text-xs">
                            <Minus className="w-3.5 h-3.5" />
                            flat
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                        {kw.clicks30d.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                        {kw.impressions30d.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
              ↑ improved = lower position number (closer to #1) · GSC Average Position is not an exact rank
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

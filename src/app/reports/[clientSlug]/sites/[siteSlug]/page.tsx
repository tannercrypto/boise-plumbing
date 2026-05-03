// src/app/reports/[clientSlug]/sites/[siteSlug]/page.tsx
// Client-facing site performance report.
// Safe: no internal valuation, margins, admin settings, or API logs.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getClientBySlug, getSiteReportData } from "@/lib/db/reports";
import { getSiteBySlug } from "@/lib/db/sites";
import { hasReportAccess } from "@/lib/auth/reportToken";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "Site Performance Report",
  robots: { index: false, follow: false },
};

export default async function SiteReportPage({
  params,
}: {
  params: Promise<{ clientSlug: string; siteSlug: string }>;
}) {
  const { clientSlug, siteSlug } = await params;

  const authed = await hasReportAccess(clientSlug);
  if (!authed) {
    redirect(`/reports/${clientSlug}`);
  }

  const [client, site] = await Promise.all([
    getClientBySlug(clientSlug),
    getSiteBySlug(siteSlug),
  ]);

  if (!client || !site) notFound();

  // Verify this client has leads on this site
  const hasAccess = await prisma.lead.findFirst({
    where:  { clientId: client.id, siteId: site.id },
    select: { id: true },
  });
  if (!hasAccess) notFound();

  const report = await getSiteReportData(site.id, client.id);
  if (!report) notFound();

  const hasGscData = report.organicClicks30d > 0 || report.impressions30d > 0;

  return (
    <div>
      {/* Back link (only shown if client has multiple sites) */}
      <Link
        href={`/reports/${clientSlug}`}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 text-sm mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All Sites
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{report.siteName}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {report.domain} · 30-day performance · Report date: {report.reportDate}
        </p>
      </div>

      {/* Lead funnel */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Leads"       value={report.totalLeads30d.toString()}  note="30 days" />
          <MetricCard label="Booked Jobs"        value={report.bookedJobs30d.toString()}  note="30 days" highlight />
          <MetricCard
            label="Estimated Revenue"
            value={fmtMoney(report.estimatedRevenue30d)}
            note="30 days"
          />
          <MetricCard
            label="Confirmed Revenue"
            value={fmtMoney(report.confirmedRevenue30d)}
            note="30 days"
            highlight
          />
        </div>
      </section>

      {/* Search performance */}
      {hasGscData && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Organic Clicks"   value={report.organicClicks30d.toLocaleString()} note="30 days" />
            <MetricCard label="Impressions"       value={report.impressions30d.toLocaleString()}   note="30 days" />
            <MetricCard
              label="Avg Position"
              value={report.avgPosition30d > 0 ? report.avgPosition30d.toFixed(1) : "—"}
              note="GSC average · not exact rank"
            />
            <MetricCard
              label="Avg CTR"
              value={report.avgCtr30d > 0 ? `${(report.avgCtr30d * 100).toFixed(1)}%` : "—"}
              note="30 days"
            />
          </div>

          {/* Position trend */}
          {report.positionTrend.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                GSC Average Position Trend
                <span className="text-xs text-gray-400 ml-2 font-normal">
                  (lower = closer to #1)
                </span>
              </div>
              <PositionSparkline data={report.positionTrend} />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{report.positionTrend[0]?.date}</span>
                <span>{report.positionTrend[report.positionTrend.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Top pages */}
          {report.topPages.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <ReportTable
                title="Top Pages by Clicks"
                rows={report.topPages.map((r) => ({ label: r.page, value: r.clicks.toLocaleString() }))}
              />
              <ReportTable
                title="Top Queries"
                rows={report.topQueries.slice(0, 10).map((r) => ({
                  label: r.query,
                  value: r.clicks.toLocaleString(),
                  sub:   `Avg pos: ${r.position.toFixed(1)}`,
                }))}
              />
            </div>
          )}
        </section>
      )}

      {!hasGscData && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          Search Console data will appear here once connected.
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
        Data reflects trailing 30-day performance. Search Console position data is an average
        across all queries and dates — it is not an exact rank. Revenue figures reflect values
        recorded in the platform.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n === 0) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function MetricCard({
  label, value, note, highlight,
}: {
  label: string; value: string; note?: string; highlight?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`text-2xl font-black mb-1 ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
      {note && <div className="text-xs text-gray-400 mt-0.5">{note}</div>}
    </div>
  );
}

function ReportTable({
  title, rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; sub?: string }>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((row, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600 truncate flex-1">{row.label}</span>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium text-gray-900">{row.value}</div>
              {row.sub && <div className="text-xs text-gray-400">{row.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionSparkline({ data }: { data: Array<{ date: string; position: number }> }) {
  const positions = data.map((d) => d.position);
  const min = Math.min(...positions);
  const max = Math.max(...positions, min + 1);
  const range = max - min;

  const pts = positions
    .map((v, i) => {
      const x = (i / (positions.length - 1)) * 300;
      // Invert: lower position (better rank) = higher y coordinate in graph space → lower in SVG
      const y = 36 - ((max - v) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 300 40" className="w-full h-16">
      <polyline
        points={pts}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

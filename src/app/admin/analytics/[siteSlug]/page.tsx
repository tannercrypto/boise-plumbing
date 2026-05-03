// src/app/admin/analytics/[siteSlug]/page.tsx
// Per-site analytics dashboard: leads, search performance, revenue.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSiteBySlug } from "@/lib/db/sites";
import { getSiteAnalyticsSummary, getUnreadAlerts, getLatestSnapshot } from "@/lib/db/analytics";
import { computeSiteValuation } from "@/lib/valuation/assetValuation";

export const metadata: Metadata = {
  title:  "Analytics — Admin",
  robots: { index: false, follow: false },
};

export default async function SiteAnalyticsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const [summary, snapshot, alerts] = await Promise.all([
    getSiteAnalyticsSummary(site.id),
    getLatestSnapshot(site.id),
    getUnreadAlerts(site.id),
  ]);

  // Asset valuation — uses snapshot revenue data
  const valuation = snapshot
    ? await computeSiteValuation(site.id, {
        confirmedRevenue30d:  snapshot.confirmedRevenue30d,
        estimatedRevenue30d:  snapshot.estimatedRevenue30d,
      })
    : null;

  const hasGscData = summary.organicClicks30d > 0 || summary.impressions30d > 0;

  return (
    <AdminShell activePath="/admin/analytics">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{site.name}</h1>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded font-mono">
                {site.domain}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">Last 30 days · Analytics dashboard</p>
          </div>
          <Link
            href={`/admin/analytics/${siteSlug}/keywords`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            Keyword Movement
          </Link>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm border ${
                  alert.severity === "CRITICAL"
                    ? "bg-red-950 border-red-800 text-red-300"
                    : "bg-yellow-950 border-yellow-800 text-yellow-300"
                }`}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Leads (30d)"      value={summary.totalLeads.toString()}   sub="form submissions" />
          <KpiCard label="Organic Clicks"   value={fmt(summary.organicClicks30d)}   sub="GSC 30d" dim={!hasGscData} />
          <KpiCard label="Impressions"      value={fmt(summary.impressions30d)}     sub="GSC 30d" dim={!hasGscData} />
          <KpiCard
            label="Jobber Sync Rate"
            value={`${Math.round(summary.jobberSuccessRate * 100)}%`}
            sub="success rate"
            alert={summary.jobberSuccessRate < 0.75}
          />
        </div>

        {/* Revenue row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <RevenueCard
            label="Estimated Revenue (30d)"
            value={summary.estimatedRevenue30d}
            note="Set per lead · includes unconfirmed"
          />
          <RevenueCard
            label="Confirmed Revenue (30d)"
            value={summary.confirmedRevenue30d}
            note="Confirmed booked jobs only"
          />
        </div>

        {/* Asset valuation */}
        {valuation && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-sm">Asset Valuation</h2>
                <p className="text-gray-600 text-xs mt-0.5">
                  Based on{" "}
                  {valuation.profitBasis === "confirmed_commission" && "confirmed commission (30d)"}
                  {valuation.profitBasis === "estimated_commission" && "estimated commission (30d)"}
                  {valuation.profitBasis === "estimated_lead_value" && "20% margin on estimated lead value (30d)"}
                  {" "}· Monthly profit: ${valuation.monthlyProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <ValuationCard label="Conservative" multiple="18×" value={valuation.conservative} color="text-gray-300" />
              <ValuationCard label="Base"          multiple="24×" value={valuation.base}         color="text-blue-400"  highlight />
              <ValuationCard label="Aggressive"    multiple="36×" value={valuation.aggressive}   color="text-green-400" />
            </div>
            <p className="text-gray-700 text-xs mt-4 leading-relaxed">{valuation.disclaimer}</p>
          </div>
        )}

        {/* Two-column breakdowns */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">

          {/* Leads by page */}
          <BreakdownTable
            title="Leads by Landing Page"
            rows={summary.leadsByPage.map((r) => ({ label: r.page, value: r.count }))}
            total={summary.totalLeads}
          />

          {/* Leads by service */}
          <BreakdownTable
            title="Leads by Service"
            rows={summary.leadsByService.map((r) => ({
              label: r.service.replace(/-/g, " "),
              value: r.count,
            }))}
            total={summary.totalLeads}
          />

          {/* Leads by source */}
          <BreakdownTable
            title="Leads by Traffic Source"
            rows={summary.leadsBySource.map((r) => ({ label: r.source, value: r.count }))}
            total={summary.totalLeads}
          />

          {/* GSC CTR trend (last 30 data points) */}
          {hasGscData && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">
                GSC CTR Trend (30d)
              </h3>
              <div className="text-xs text-gray-500 mb-2">
                Avg CTR: {(summary.avgCtr30d * 100).toFixed(2)}% ·
                GSC Avg Position: {summary.avgPosition30d.toFixed(1)}
              </div>
              <MiniSparkline values={summary.ctrTrend.map((r) => r.ctr)} />
              <div className="flex justify-between text-xs text-gray-700 mt-1">
                <span>{summary.ctrTrend[0]?.date ?? ""}</span>
                <span>{summary.ctrTrend[summary.ctrTrend.length - 1]?.date ?? ""}</span>
              </div>
            </div>
          )}
        </div>

        {/* Search performance trends */}
        {hasGscData && (
          <div className="grid md:grid-cols-2 gap-6">
            <TrendTable
              title="Organic Clicks (daily)"
              rows={summary.clicksTrend.slice(-14).map((r) => ({
                label: r.date,
                value: r.clicks,
              }))}
            />
            <TrendTable
              title="Impressions (daily)"
              rows={summary.impressionsTrend.slice(-14).map((r) => ({
                label: r.date,
                value: r.impressions,
              }))}
            />
          </div>
        )}

        {!hasGscData && (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm mb-3">No Google Search Console data yet.</p>
            <Link
              href={`/api/admin/analytics/gsc/connect?siteSlug=${siteSlug}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Connect Search Console
            </Link>
          </div>
        )}

      </div>
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (co-located — no need for separate files at this scale)
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function KpiCard({
  label, value, sub, dim, alert,
}: {
  label: string; value: string; sub: string; dim?: boolean; alert?: boolean;
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${alert ? "border-red-800" : "border-gray-800"}`}>
      <div className={`text-2xl font-black mb-1 ${dim ? "text-gray-600" : alert ? "text-red-400" : "text-white"}`}>
        {value}
      </div>
      <div className="text-xs font-medium text-gray-400">{label}</div>
      <div className="text-xs text-gray-600">{sub}</div>
    </div>
  );
}

function RevenueCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-2xl font-black text-green-400 mb-1">
        ${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
      <div className="text-sm font-medium text-gray-400">{label}</div>
      <div className="text-xs text-gray-600 mt-0.5">{note}</div>
    </div>
  );
}

function BreakdownTable({
  title, rows, total,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  total: number;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-gray-600 text-sm text-center">No data yet</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={row.label} className="px-5 py-2.5 flex items-center gap-3">
                <span className="text-gray-400 text-xs truncate flex-1 capitalize">{row.label}</span>
                <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-white text-xs font-medium w-6 text-right">{row.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrendTable({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.label} className="px-5 py-2 flex items-center gap-3">
            <span className="text-gray-500 text-xs w-24 shrink-0">{row.label}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="text-white text-xs font-medium w-10 text-right">{fmt(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <div className="h-12 text-gray-700 text-xs">No data</div>;
  const max = Math.max(...values, 0.0001);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 200;
    const y = 40 - (v / max) * 36;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 200 40" className="w-full h-12">
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

function ValuationCard({
  label, multiple, value, color, highlight,
}: {
  label: string; multiple: string; value: number; color: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "bg-gray-800" : "bg-gray-900/50"}`}>
      <div className="text-xs text-gray-500 mb-1">{label} <span className="text-gray-600">{multiple}</span></div>
      <div className={`text-xl font-black ${color}`}>
        ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

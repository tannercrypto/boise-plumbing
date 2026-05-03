// src/app/admin/dashboard/page.tsx
// Portfolio overview — top-level admin dashboard.
// Shows all sites, aggregate metrics, alerts, Jobber health.

import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Globe } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPortfolioStats } from "@/lib/db/revenue";
import { getAllActiveSites } from "@/lib/db/sites";
import { getLatestSnapshot } from "@/lib/db/analytics";

export const metadata: Metadata = {
  title:  "Dashboard — Admin",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const [stats, sites] = await Promise.all([
    getPortfolioStats(),
    getAllActiveSites(),
  ]);

  // Fetch latest snapshot for each site
  const siteSnapshots = await Promise.all(
    sites.map(async (s: typeof sites[number]) => {
      const snap = await getLatestSnapshot(s.id);
      return { ...s, snapshot: snap };
    })
  );

  const hasAlertSite = (slug: string) =>
    stats.sitesWithAlerts.some((a) => a.slug === slug);

  return (
    <AdminShell activePath="/admin/dashboard">
      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Portfolio Overview</h1>
          <p className="text-gray-500 text-sm mt-1">All sites · trailing 30 days</p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Active Sites"
            value={stats.totalSites.toString()}
            icon={<Globe className="w-4 h-4" />}
            color="text-blue-400"
          />
          <KpiCard
            label="Total Leads (30d)"
            value={stats.totalLeads30d.toLocaleString()}
            icon={<TrendingUp className="w-4 h-4" />}
            color="text-green-400"
          />
          <KpiCard
            label="Confirmed Revenue (30d)"
            value={`$${stats.totalConfirmedRevenue30d.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            icon={<TrendingUp className="w-4 h-4" />}
            color="text-emerald-400"
          />
          <KpiCard
            label="Jobber Sync Rate"
            value={`${Math.round(stats.jobberSyncHealth.successRate * 100)}%`}
            icon={
              stats.jobberSyncHealth.successRate >= 0.75
                ? <CheckCircle className="w-4 h-4" />
                : <XCircle className="w-4 h-4" />
            }
            color={stats.jobberSyncHealth.successRate >= 0.75 ? "text-green-400" : "text-red-400"}
            sub={`${stats.jobberSyncHealth.totalAttempts} attempts`}
          />
        </div>

        {/* Top performing site */}
        {stats.topSite && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
              Top Performing Site (Leads)
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg">{stats.topSite.name}</div>
                <div className="text-gray-500 text-sm">{stats.topSite.leads30d} leads in 30 days</div>
              </div>
              <Link
                href={`/admin/analytics/${stats.topSite.slug}`}
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                View Analytics →
              </Link>
            </div>
          </div>
        )}

        {/* Alerts summary */}
        {stats.sitesWithAlerts.length > 0 && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-semibold text-sm">Active Alerts</span>
            </div>
            <div className="space-y-2">
              {stats.sitesWithAlerts.map((a) => (
                <div key={a.slug} className="flex items-center justify-between">
                  <span className="text-yellow-200 text-sm">{a.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-500 text-xs">{a.alertCount} unread</span>
                    <Link
                      href={`/admin/analytics/${a.slug}`}
                      className="text-xs text-yellow-400 hover:text-yellow-200 transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Site cards */}
        <h2 className="text-white font-bold mb-4">All Sites</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {siteSnapshots.map((site) => {
            const snap = site.snapshot;
            const hasAlert = hasAlertSite(site.slug);
            return (
              <div
                key={site.id}
                className={`bg-gray-900 border rounded-xl p-5 ${hasAlert ? "border-yellow-800" : "border-gray-800"}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{site.name}</h3>
                      {hasAlert && (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{site.domain}</div>
                  </div>
                  <Link
                    href={`/admin/analytics/${site.slug}`}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Analytics →
                  </Link>
                </div>

                {snap ? (
                  <div className="grid grid-cols-3 gap-3">
                    <Metric label="Leads (30d)"    value={snap.leads30d.toString()} />
                    <Metric label="Booked"         value={snap.bookedJobs30d.toString()} />
                    <Metric
                      label="Revenue"
                      value={`$${(snap.confirmedRevenue30d || snap.estimatedRevenue30d).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                      note={snap.confirmedRevenue30d > 0 ? "confirmed" : "estimated"}
                    />
                    <Metric label="Clicks (30d)"   value={snap.organicClicks30d.toLocaleString()} />
                    <Metric label="Impressions"    value={snap.impressions30d.toLocaleString()} />
                    <Metric
                      label="Sync Rate"
                      value={`${Math.round(snap.jobberSyncRate * 100)}%`}
                      alert={snap.jobberSyncRate < 0.75}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">No snapshot yet — run the cron job to generate.</p>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color, sub,
}: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`flex items-center gap-2 ${color} mb-1`}>
        {icon}
        <span className="text-2xl font-black">{value}</span>
      </div>
      <div className="text-xs text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

function Metric({
  label, value, note, alert,
}: {
  label: string; value: string; note?: string; alert?: boolean;
}) {
  return (
    <div>
      <div className={`text-sm font-semibold ${alert ? "text-red-400" : "text-white"}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
      {note && <div className="text-xs text-gray-700">{note}</div>}
    </div>
  );
}

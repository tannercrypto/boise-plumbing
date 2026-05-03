export const dynamic = 'force-dynamic';
// src/app/admin/leads/page.tsx
// Lead list dashboard — protected by middleware session check.

import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getLeads, type LeadWithSite } from "@/lib/db/leads";
import { getAllActiveSites } from "@/lib/db/sites";
import { formatDate, formatPhone, getUrgencyColor, getStatusBadge } from "@/lib/utils";

export const metadata: Metadata = {
  title:  "Leads — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params         = await searchParams;
  const selectedSiteId = params.siteId;

  const [sites, { leads, total }] = await Promise.all([
    getAllActiveSites(),
    getLeads({ siteId: selectedSiteId, limit: 100 }),
  ]);

  const stats = {
    total,
    new:       leads.filter((l: LeadWithSite) => l.status === "NEW").length,
    synced:    leads.filter((l: LeadWithSite) => l.jobberSyncStatus === "SUCCESS").length,
    errors:    leads.filter((l: LeadWithSite) => l.jobberSyncStatus === "ERROR").length,
    emergency: leads.filter((l: LeadWithSite) => l.urgency === "EMERGENCY").length,
  };

  return (
    <AdminShell activePath="/admin/leads">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Leads</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} total submissions</p>
          </div>
          <div className="flex gap-3">
            {sites.map((site: { id: string; name: string; slug: string }) => (
              <a
                key={site.id}
                href={`/api/admin/jobber-connect?siteSlug=${site.slug}`}
                className="text-xs bg-purple-700 text-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Connect Jobber — {site.name}
              </a>
            ))}
          </div>
        </div>

        {/* Flash messages */}
        {params.jobber_connected && (
          <div className="bg-green-950 border border-green-800 rounded-lg p-3 mb-5 text-green-300 text-sm">
            ✅ Jobber connected successfully!
          </div>
        )}
        {params.jobber_error && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-5 text-red-300 text-sm">
            ❌ Jobber error: {decodeURIComponent(params.jobber_error)}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total",     value: stats.total,     color: "text-white" },
            { label: "New",       value: stats.new,       color: "text-blue-400" },
            { label: "Synced",    value: stats.synced,    color: "text-green-400" },
            { label: "Errors",    value: stats.errors,    color: "text-red-400" },
            { label: "Emergency", value: stats.emergency, color: "text-orange-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Site filter */}
        {sites.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <Link
              href="/admin/leads"
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !selectedSiteId
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              All Sites
            </Link>
            {sites.map((site: { id: string; name: string }) => (
              <Link
                key={site.id}
                href={`/admin/leads?siteId=${site.id}`}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedSiteId === site.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {site.name}
              </Link>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Site</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Service</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Urgency</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Jobber</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-600 text-sm">
                      No leads yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: LeadWithSite) => (
                    <tr key={lead.id} className="hover:bg-gray-800/50 transition-colors group">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors"
                        >
                          {lead.name}
                        </Link>
                        <div>
                          <a href={`tel:${lead.phone}`} className="text-blue-500 text-xs hover:underline">
                            {formatPhone(lead.phone)}
                          </a>
                        </div>
                        <div className="text-xs text-gray-600 truncate max-w-[140px]">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-400">{lead.site?.name}</div>
                        <div className="text-xs text-gray-600 truncate max-w-[100px]">{lead.sourceLabel}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs capitalize">
                        {lead.service.replace(/-/g, " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(lead.urgency)}`}>
                          {lead.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(lead.status)}`}>
                          {lead.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {lead.jobberSyncStatus === "SUCCESS" && <span className="text-green-400 font-medium">✓ Synced</span>}
                        {lead.jobberSyncStatus === "ERROR"   && (
                          <span className="text-red-400 font-medium" title={lead.jobberError ?? ""}>✗ Error</span>
                        )}
                        {lead.jobberSyncStatus === "PENDING" && <span className="text-yellow-500">⏳ Pending</span>}
                        {lead.jobberSyncStatus === "SKIPPED" && <span className="text-gray-600">— Skipped</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-gray-500 truncate max-w-[90px]">{lead.landingPageUrl}</div>
                        <div className="text-gray-600">
                          {lead.utmSource   ? lead.utmSource
                           : lead.gclid     ? "gclid"
                           : lead.fbclid    ? "fbclid"
                           : "organic"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

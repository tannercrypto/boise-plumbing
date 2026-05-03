// src/app/admin/sites/page.tsx

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAllActiveSites } from "@/lib/db/sites";
import { prisma } from "@/lib/db/client";
import { getActiveJobberConnection } from "@/lib/db/jobberConnections";

export const metadata: Metadata = {
  title:  "Sites — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSitesPage() {
  const sites = await getAllActiveSites();

  // For each site, load lead count + Jobber connection status
  const siteData = await Promise.all(
    sites.map(async (site: Awaited<ReturnType<typeof getAllActiveSites>>[number]) => {
      const [leadCount, connection, gscProp, ga4Prop] = await Promise.all([
        prisma.lead.count({ where: { siteId: site.id } }),
        getActiveJobberConnection(site.id),
        prisma.gscProperty.findUnique({ where: { siteId: site.id } }),
        prisma.ga4Property.findUnique({ where: { siteId: site.id } }),
      ]);
      return {
        ...site,
        leadCount,
        jobberConnected: !!connection,
        gscConnected:    !!gscProp?.isActive,
        ga4Connected:    !!ga4Prop?.isActive,
      };
    })
  );

  return (
    <AdminShell activePath="/admin/sites">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Sites</h1>
          <p className="text-gray-500 text-sm mt-1">{sites.length} active site{sites.length !== 1 ? "s" : ""} in the portfolio</p>
        </div>

        <div className="grid gap-4">
          {siteData.map((site) => (
            <div
              key={site.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-white font-bold text-lg">{site.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${site.isActive ? "bg-green-950 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                      {site.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{site.domain}</p>
                </div>

                {/* Jobber connect / status */}
                <div className="text-right shrink-0 ml-6">
                  {site.jobberConnected ? (
                    <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-medium">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      Jobber Connected
                    </span>
                  ) : (
                    <a
                      href={`/api/admin/jobber-connect?siteSlug=${site.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Connect Jobber
                    </a>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-800">
                <Stat label="City"         value={`${site.city}, ${site.state}`} />
                <Stat label="Phone"        value={site.phoneNumber} />
                <Stat label="Source Label" value={site.sourceLabel} />
                <Stat label="Total Leads"  value={String(site.leadCount)} highlight />
              </div>

              {/* Analytics connections */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800">
                <a
                  href={`/api/admin/analytics/gsc/connect?siteSlug=${site.slug}`}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {site.gscConnected ? "✓ GSC Connected" : "Connect Search Console"}
                </a>
                <a
                  href={`/api/admin/analytics/gsc/connect?siteSlug=${site.slug}`}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                  title="Add ?propertyId=YOUR_GA4_ID to the GA4 connect URL"
                >
                  {site.ga4Connected ? "✓ GA4 Connected" : "Connect GA4"}
                </a>
                <a
                  href={`/admin/analytics/${site.slug}`}
                  className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors ml-auto"
                >
                  View Analytics →
                </a>
              </div>

              {/* IDs + quick links */}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-700 font-mono">
                  ID: {site.id} · Slug: {site.slug}
                </div>
                <a
                  href={`/admin/sites/${site.slug}/launch-checklist`}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Launch checklist →
                </a>
              </div>
            </div>
          ))}
        </div>

        {siteData.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p>No sites found. Run <code className="bg-gray-800 px-1 rounded">npx prisma db seed</code> to add the Boise Plumbing site.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${highlight ? "text-white" : "text-gray-400"}`}>{value}</div>
    </div>
  );
}

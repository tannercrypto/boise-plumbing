// src/app/admin/sites/[siteSlug]/launch-checklist/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, Rocket } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSiteBySlug } from "@/lib/db/sites";
import { prisma } from "@/lib/db/client";
import type { ChecklistItem } from "@/app/api/admin/sites/[siteSlug]/launch-checklist/route";

export const metadata: Metadata = {
  title:  "Launch Checklist — Admin",
  robots: { index: false, follow: false },
};

export default async function LaunchChecklistPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  // Fetch checklist data directly (server component — no fetch needed)
  const [jobberConn, gscProp, ga4Prop, leadCount, hasClient, clientSettings] = await Promise.all([
    prisma.jobberConnection.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.gscProperty.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.ga4Property.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.lead.count({ where: { siteId: site.id } }),
    prisma.lead.findFirst({ where: { siteId: site.id }, select: { clientId: true } }),
    prisma.clientSettings.findFirst({ where: { client: { leads: { some: { siteId: site.id } } } } }),
  ]);

  const items: ChecklistItem[] = [
    { id: "site-created",    label: "Site record created",            status: "complete",                                      note: `ID: ${site.id}` },
    { id: "site-active",     label: "Site marked active",             status: site.isActive ? "complete" : "incomplete",       note: site.isActive ? undefined : "Set isActive = true" },
    { id: "client-lead",     label: "Test lead submitted",            status: leadCount > 0 ? "complete" : "incomplete",       note: leadCount > 0 ? `${leadCount} leads received` : "Submit a test lead via the public form" },
    { id: "jobber",          label: "Jobber connected",               status: jobberConn ? "complete" : "incomplete",          note: jobberConn ? "Connected" : "Sites → Connect Jobber" },
    { id: "routing",         label: "Routing configured",             status: clientSettings?.defaultRoute ? "complete" : "incomplete", note: clientSettings?.defaultRoute ?? "Client Settings → Default Route" },
    { id: "messaging",       label: "SMS messaging enabled",          status: clientSettings?.messagingEnabled ? "complete" : "optional", note: clientSettings?.messagingEnabled ? "Enabled" : "Optional" },
    { id: "tracking-phone",  label: "Call tracking phone set",        status: site.trackingPhone ? "complete" : "optional",    note: site.trackingPhone ?? "Optional — Sites → Call Tracking" },
    { id: "gsc",             label: "Google Search Console connected", status: gscProp ? "complete" : "incomplete",            note: gscProp?.propertyUri ?? "Sites → Connect Search Console" },
    { id: "ga4",             label: "Google Analytics 4 connected",   status: ga4Prop ? "complete" : "optional",              note: ga4Prop?.propertyId ?? "Optional" },
    { id: "sitemap",         label: "NEXT_PUBLIC_SITE_URL configured", status: process.env.NEXT_PUBLIC_SITE_URL ? "complete" : "incomplete", note: process.env.NEXT_PUBLIC_SITE_URL ?? "Set env var" },
  ];

  const incomplete    = items.filter((i) => i.status === "incomplete").length;
  const complete      = items.filter((i) => i.status === "complete").length;
  const isLaunchReady = incomplete === 0;

  return (
    <AdminShell activePath="/admin/sites">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/admin/sites"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Sites
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Launch Checklist
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{site.name} · {site.domain}</p>
          </div>
          <div className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
            isLaunchReady ? "bg-green-950 text-green-400" : "bg-yellow-950 text-yellow-400"
          }`}>
            {isLaunchReady ? "✓ Ready to launch" : `${incomplete} item${incomplete === 1 ? "" : "s"} remaining`}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-800 rounded-full h-2 mb-8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLaunchReady ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${(complete / items.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-4 bg-gray-900 border rounded-xl px-5 py-4 ${
                item.status === "complete"   ? "border-gray-800" :
                item.status === "incomplete" ? "border-red-900" :
                "border-gray-800 opacity-70"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.status === "complete" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {item.status === "incomplete" && <XCircle className="w-5 h-5 text-red-500" />}
                {item.status === "optional" && <AlertCircle className="w-5 h-5 text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  item.status === "complete"   ? "text-white" :
                  item.status === "incomplete" ? "text-red-300" :
                  "text-gray-500"
                }`}>
                  {item.label}
                  {item.status === "optional" && (
                    <span className="ml-2 text-xs text-gray-600 font-normal">(optional)</span>
                  )}
                </div>
                {item.note && (
                  <div className="text-xs text-gray-600 mt-0.5 truncate">{item.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {isLaunchReady && (
          <div className="mt-8 bg-green-950 border border-green-800 rounded-xl p-6 text-center">
            <Rocket className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-300 font-semibold">All required items complete.</p>
            <p className="text-green-700 text-sm mt-1">
              {site.name} is ready for real traffic.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

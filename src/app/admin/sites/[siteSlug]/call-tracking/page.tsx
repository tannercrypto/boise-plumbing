// src/app/admin/sites/[siteSlug]/call-tracking/page.tsx
// Call tracking configuration UI.
// Stores settings in DB — no Twilio integration yet (Phase 5).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Phone } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSiteBySlug } from "@/lib/db/sites";
import { prisma } from "@/lib/db/client";
import { CallTrackingForm } from "@/components/admin/CallTrackingForm";

export const metadata: Metadata = {
  title:  "Call Tracking — Admin",
  robots: { index: false, follow: false },
};

export default async function CallTrackingPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const settings = await prisma.site.findUnique({
    where:  { id: site.id },
    select: {
      trackingPhone:        true,
      forwardingPhone:      true,
      callTrackingProvider: true,
      callTrackingEnabled:  true,
    },
  });

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

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Call Tracking</h1>
            <p className="text-gray-500 text-sm">{site.name} · {site.domain}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="bg-blue-950 border border-blue-800 rounded-lg px-4 py-3 mb-6 text-blue-300 text-sm">
            <strong>Phase 5 Preview:</strong> Call tracking fields are ready to store.
            Twilio integration and dynamic number insertion will be added in Phase 5.
            Configure these now so site setup is complete.
          </div>

          <CallTrackingForm
            siteSlug={siteSlug}
            initialSettings={{
              trackingPhone:        settings?.trackingPhone        ?? "",
              forwardingPhone:      settings?.forwardingPhone      ?? "",
              callTrackingProvider: settings?.callTrackingProvider ?? "",
              callTrackingEnabled:  settings?.callTrackingEnabled  ?? false,
            }}
          />
        </div>

        {/* Call leads table placeholder */}
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-8 text-center">
          <Phone className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm mb-1">No call logs yet</p>
          <p className="text-gray-700 text-xs">
            Call events will appear here once Twilio integration is configured (Phase 5).
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

// src/app/reports/[clientSlug]/page.tsx
// Client-facing report index — shows all sites for this client.
// Protected by signed report token (cookie or ?token= param).

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Globe, TrendingUp } from "lucide-react";
import { getClientBySlug, getClientSites } from "@/lib/db/reports";
import { hasReportAccess } from "@/lib/auth/reportToken";
import { ReportLoginForm } from "@/components/reports/ReportLoginForm";

export const metadata: Metadata = {
  title:  "Performance Report",
  robots: { index: false, follow: false },
};

export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;

  const client = await getClientBySlug(clientSlug);
  if (!client) notFound();

  // Check auth — cookie or ?token= param (server-side via cookies())
  const authed = await hasReportAccess(clientSlug);

  if (!authed) {
    // Show login form — client enters the report token
    return (
      <div className="max-w-sm mx-auto pt-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Report</h1>
          <p className="text-gray-500 text-sm">Enter your report access token to continue.</p>
        </div>
        <ReportLoginForm clientSlug={clientSlug} />
      </div>
    );
  }

  const sites = await getClientSites(client.id);

  if (sites.length === 1) {
    redirect(`/reports/${clientSlug}/sites/${sites[0].slug}`);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
        <p className="text-gray-500 text-sm mt-1">
          {client.name} · {sites.length} site{sites.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sites.map((site: typeof sites[number]) => (
          <Link
            key={site.id}
            href={`/reports/${clientSlug}/sites/${site.slug}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {site.name}
                </div>
                <div className="text-xs text-gray-400">{site.domain}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              View report →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

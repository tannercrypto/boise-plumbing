// src/app/admin/leads/[id]/page.tsx
// Lead detail page — shows all fields, attribution, Jobber state, API logs.
// Status updates and Jobber retry are handled by client action buttons.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getLeadById, type LeadDetail } from "@/lib/db/leads";
import { formatDate, formatPhone, getUrgencyColor, getStatusBadge } from "@/lib/utils";
import { LeadActions } from "@/components/admin/LeadActions";
import { RevenueEditor } from "@/components/admin/RevenueEditor";

export const metadata: Metadata = {
  title:  "Lead Detail — Admin",
  robots: { index: false, follow: false },
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead   = await getLeadById(id);
  if (!lead) notFound();

  return (
    <AdminShell activePath="/admin/leads">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Back */}
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to leads
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">{lead.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Lead ID: <span className="font-mono text-gray-400">{lead.id}</span>
            </p>
          </div>
          {/* Live status + action buttons */}
          <LeadActions
            leadId={lead.id}
            currentStatus={lead.status}
            jobberSyncStatus={lead.jobberSyncStatus}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Customer info ───────────────────────────────────────── */}
          <Section title="Customer">
            <Row label="Name"    value={lead.name} />
            <Row label="Phone">
              <a href={`tel:${lead.phone}`} className="text-blue-400 hover:underline">
                {formatPhone(lead.phone)}
              </a>
            </Row>
            <Row label="Email">
              <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline">
                {lead.email}
              </a>
            </Row>
            <Row label="Address"  value={lead.address} />
            {lead.client && (
              <Row label="Client ID">
                <Link href={`/admin/clients`} className="font-mono text-xs text-gray-400 hover:text-white">
                  {lead.client.id}
                </Link>
              </Row>
            )}
          </Section>

          {/* ── Service request ─────────────────────────────────────── */}
          <Section title="Service Request">
            <Row label="Service">
              <span className="capitalize">{lead.service.replace(/-/g, " ")}</span>
            </Row>
            <Row label="Urgency">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(lead.urgency)}`}>
                {lead.urgency}
              </span>
            </Row>
            <Row label="Lead Status">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(lead.status)}`}>
                {lead.status.replace(/_/g, " ")}
              </span>
            </Row>
            <Row label="Submitted" value={formatDate(lead.createdAt)} />
            {lead.notes && <Row label="Notes" value={lead.notes} />}
          </Section>

          {/* ── Attribution ─────────────────────────────────────────── */}
          <Section title="Attribution">
            <Row label="Site"         value={lead.site?.name ?? lead.siteId} />
            <Row label="Source Label" value={lead.sourceLabel} />
            <Row label="Landing Page" value={lead.landingPageUrl} />
            {lead.referrer    && <Row label="Referrer"     value={lead.referrer} />}
            {lead.utmSource   && <Row label="UTM Source"   value={lead.utmSource} />}
            {lead.utmMedium   && <Row label="UTM Medium"   value={lead.utmMedium} />}
            {lead.utmCampaign && <Row label="UTM Campaign" value={lead.utmCampaign} />}
            {lead.utmTerm     && <Row label="UTM Term"     value={lead.utmTerm} />}
            {lead.utmContent  && <Row label="UTM Content"  value={lead.utmContent} />}
            {lead.gclid       && <Row label="gclid"        value={lead.gclid} mono />}
            {lead.fbclid      && <Row label="fbclid"       value={lead.fbclid} mono />}
          </Section>

          {/* ── Jobber sync ─────────────────────────────────────────── */}
          <Section title="Jobber Integration">
            <Row label="Sync Status">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${jobberStatusColor(lead.jobberSyncStatus)}`}>
                {lead.jobberSyncStatus}
              </span>
            </Row>
            {lead.jobberClientId  && <Row label="Jobber Client ID"  value={lead.jobberClientId}  mono />}
            {lead.jobberRequestId && <Row label="Jobber Request ID" value={lead.jobberRequestId} mono />}
            {lead.jobberSyncedAt  && <Row label="Synced At"         value={formatDate(lead.jobberSyncedAt)} />}
            {lead.jobberError     && (
              <Row label="Error">
                <span className="text-red-400 text-xs break-all">{lead.jobberError}</span>
              </Row>
            )}
          </Section>

          {/* ── Revenue ─────────────────────────────────────────────── */}
          <Section title="Revenue">
            <RevenueEditor
              leadId={lead.id}
              estimatedJobValue={lead.estimatedJobValue ?? null}
              confirmedJobValue={lead.confirmedJobValue ?? null}
              revenueSource={lead.revenueSource ?? null}
              commissionAmount={lead.commissionAmount ?? null}
            />
          </Section>
        </div>

        {/* ── Jobber API Logs ──────────────────────────────────────── */}
        {lead.jobberApiLogs && lead.jobberApiLogs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-white font-bold mb-3">Jobber API Log</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">Operation</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">HTTP</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">Duration</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {lead.jobberApiLogs.map((log: LeadDetail["jobberApiLogs"][number]) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-300 font-mono">{log.operation}</td>
                      <td className="px-4 py-2.5">
                        <span className={log.status === "SUCCESS" ? "text-green-400" : log.status === "ERROR" ? "text-red-400" : "text-gray-500"}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{log.httpStatus ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {log.durationMs != null ? `${log.durationMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-red-400 max-w-xs truncate">
                        {log.errorMessage ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <dl className="divide-y divide-gray-800">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3 flex gap-4">
      <dt className="text-xs text-gray-500 w-32 shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm text-gray-300 flex-1 break-all ${mono ? "font-mono text-xs" : ""}`}>
        {children ?? value ?? <span className="text-gray-700">—</span>}
      </dd>
    </div>
  );
}

function jobberStatusColor(status: string): string {
  switch (status) {
    case "SUCCESS": return "text-green-400 bg-green-950";
    case "ERROR":   return "text-red-400 bg-red-950";
    case "PENDING": return "text-yellow-400 bg-yellow-950";
    case "SKIPPED": return "text-gray-400 bg-gray-800";
    default:        return "text-gray-400 bg-gray-800";
  }
}

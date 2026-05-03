// src/app/api/admin/sites/[siteSlug]/launch-checklist/route.ts
// GET /api/admin/sites/:siteSlug/launch-checklist
// Returns the launch readiness checklist for a site.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { getSiteBySlug } from "@/lib/db/sites";
import { prisma } from "@/lib/db/client";
import type { ApiResponse } from "@/types";

export interface ChecklistItem {
  id:          string;
  label:       string;
  status:      "complete" | "incomplete" | "optional";
  note?:       string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Site not found" }, { status: 404 });
  }

  const [
    jobberConn,
    gscProp,
    ga4Prop,
    leadCount,
    clientSettings,
    hasClient,
  ] = await Promise.all([
    prisma.jobberConnection.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.gscProperty.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.ga4Property.findFirst({ where: { siteId: site.id, isActive: true } }),
    prisma.lead.count({ where: { siteId: site.id } }),
    prisma.clientSettings.findFirst({ where: { client: { leads: { some: { siteId: site.id } } } } }),
    prisma.lead.findFirst({ where: { siteId: site.id }, select: { clientId: true } }),
  ]);

  // Verify sitemap is accessible (just check the URL is configured)
  const sitemapUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/sitemap.xml`;

  const items: ChecklistItem[] = [
    {
      id:     "site-created",
      label:  "Site record created in database",
      status: "complete",   // if we got here, the site exists
      note:   `ID: ${site.id}`,
    },
    {
      id:     "site-active",
      label:  "Site marked as active",
      status: site.isActive ? "complete" : "incomplete",
      note:   site.isActive ? undefined : "Set isActive = true in database",
    },
    {
      id:     "client-assigned",
      label:  "At least one client lead submitted",
      status: hasClient ? "complete" : "incomplete",
      note:   hasClient ? `Client ID: ${hasClient.clientId}` : "Submit a test lead to assign a client",
    },
    {
      id:     "jobber-connected",
      label:  "Jobber account connected",
      status: jobberConn ? "complete" : "incomplete",
      note:   jobberConn ? "Connected" : "Visit Sites → Connect Jobber",
    },
    {
      id:     "routing-configured",
      label:  "Lead routing configured",
      status: clientSettings?.defaultRoute ? "complete" : "incomplete",
      note:   clientSettings?.defaultRoute
        ? `Route: ${clientSettings.defaultRoute}`
        : "Visit Client Settings to set default route",
    },
    {
      id:     "messaging-enabled",
      label:  "SMS messaging enabled",
      status: clientSettings?.messagingEnabled ? "complete" : "optional",
      note:   clientSettings?.messagingEnabled ? "Enabled" : "Optional — configure in Client Settings",
    },
    {
      id:     "tracking-phone",
      label:  "Call tracking phone configured",
      status: site.trackingPhone ? "complete" : "optional",
      note:   site.trackingPhone
        ? `Tracking: ${site.trackingPhone}`
        : "Optional — set in Sites → Call Tracking",
    },
    {
      id:     "gsc-connected",
      label:  "Google Search Console connected",
      status: gscProp ? "complete" : "incomplete",
      note:   gscProp
        ? `Property: ${gscProp.propertyUri}`
        : "Visit Sites → Connect Search Console",
    },
    {
      id:     "ga4-connected",
      label:  "Google Analytics 4 connected",
      status: ga4Prop ? "complete" : "optional",
      note:   ga4Prop
        ? `Property ID: ${ga4Prop.propertyId}`
        : "Optional — connect via Sites page",
    },
    {
      id:     "sitemap-configured",
      label:  "Sitemap URL configured",
      status: process.env.NEXT_PUBLIC_SITE_URL ? "complete" : "incomplete",
      note:   process.env.NEXT_PUBLIC_SITE_URL
        ? sitemapUrl
        : "Set NEXT_PUBLIC_SITE_URL in environment",
    },
    {
      id:     "test-lead",
      label:  "Test lead submitted",
      status: leadCount > 0 ? "complete" : "incomplete",
      note:   leadCount > 0
        ? `${leadCount} lead${leadCount === 1 ? "" : "s"} received`
        : "Submit a test lead via the public form",
    },
  ];

  const complete   = items.filter((i) => i.status === "complete").length;
  const required   = items.filter((i) => i.status !== "optional").length;
  const incomplete = items.filter((i) => i.status === "incomplete").length;
  const isLaunchReady = incomplete === 0;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      siteId:        site.id,
      siteName:      site.name,
      isLaunchReady,
      complete,
      total:         items.length,
      requiredTotal: required,
      items,
    },
  });
}

export const dynamic = 'force-dynamic';
// src/app/admin/analytics/page.tsx
// If someone navigates to /admin/analytics, redirect to the first active site.

import { redirect } from "next/navigation";
import { getAllActiveSites } from "@/lib/db/sites";

export default async function AnalyticsIndexPage() {
  const sites = await getAllActiveSites();
  const first = sites[0];
  if (first) {
    redirect(`/admin/analytics/${first.slug}`);
  }
  redirect("/admin/sites");
}

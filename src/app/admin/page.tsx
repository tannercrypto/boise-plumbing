// src/app/admin/page.tsx
// Redirect /admin → /admin/dashboard (portfolio overview)

import { redirect } from "next/navigation";

export default function AdminRootPage() {
  redirect("/admin/dashboard");
}

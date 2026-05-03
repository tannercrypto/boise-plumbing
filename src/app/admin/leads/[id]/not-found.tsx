// src/app/admin/leads/[id]/not-found.tsx
// Renders when getLeadById returns null and notFound() is called.

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

export default function LeadNotFound() {
  return (
    <AdminShell activePath="/admin/leads">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center py-24">
          <div className="text-6xl font-black text-gray-800 mb-4">404</div>
          <h1 className="text-xl font-bold text-white mb-2">Lead not found</h1>
          <p className="text-gray-500 text-sm mb-8">
            This lead ID doesn&apos;t exist or may have been deleted.
          </p>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to leads
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}

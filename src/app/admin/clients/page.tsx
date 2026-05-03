export const dynamic = 'force-dynamic';
// src/app/admin/clients/page.tsx

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getClients, type ClientWithCount } from "@/lib/db/clients";
import { formatDate, formatPhone } from "@/lib/utils";

export const metadata: Metadata = {
  title:  "Clients — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params         = await searchParams;
  const search         = params.search ?? "";
  const { clients, total } = await getClients({ limit: 100, search: search || undefined });

  return (
    <AdminShell activePath="/admin/clients">
      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Clients</h1>
            <p className="text-gray-500 text-sm mt-1">{total} unique contact{total !== 1 ? "s" : ""} (deduplicated)</p>
          </div>

          {/* Search */}
          <form method="GET" className="flex gap-2">
            <input
              name="search"
              defaultValue={search}
              placeholder="Name, email, or phone…"
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
            {search && (
              <a
                href="/admin/clients"
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Address</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Leads</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">First Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-600 text-sm">
                      {search ? `No clients matching "${search}"` : "No clients yet."}
                    </td>
                  </tr>
                ) : (
                  clients.map((client: ClientWithCount) => (
                    <tr key={client.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{client.name}</div>
                        <div className="text-xs text-gray-600 truncate max-w-[180px]">{client.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        <a href={`tel:${client.phone}`} className="text-blue-500 hover:underline">
                          {formatPhone(client.phone)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                        {client.address ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-6 bg-blue-950 text-blue-400 text-xs font-bold rounded-full">
                          {client._count.leads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(client.createdAt)}
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

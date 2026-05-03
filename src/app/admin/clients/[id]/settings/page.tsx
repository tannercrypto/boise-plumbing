// src/app/admin/clients/[id]/settings/page.tsx
// Per-client routing and messaging settings.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getClientById } from "@/lib/db/clients";
import { prisma } from "@/lib/db/client";
import { ClientSettingsForm } from "@/components/admin/ClientSettingsForm";

export const metadata: Metadata = {
  title:  "Client Settings — Admin",
  robots: { index: false, follow: false },
};

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const [settings, templates] = await Promise.all([
    prisma.clientSettings.findUnique({
      where: { clientId: id },
    }),
    prisma.messageTemplate.findMany({
      where:   { clientId: id, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminShell activePath="/admin/clients">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-black text-white">{client.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Routing &amp; Messaging Settings</p>
        </div>

        <ClientSettingsForm
          clientId={id}
          initialSettings={{
            defaultRoute:             settings?.defaultRoute             ?? "jobber_only",
            messagingEnabled:         settings?.messagingEnabled         ?? false,
            messageRecipientPhones:   (settings?.messageRecipientPhones  as string[]) ?? [],
            defaultMessageTemplateId: settings?.defaultMessageTemplateId ?? null,
          }}
          templates={templates}
        />
      </div>
    </AdminShell>
  );
}

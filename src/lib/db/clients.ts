// src/lib/db/clients.ts
// Finds or creates a Client record.
// Deduplication: match by phone first, then email.
// This keeps the Client table clean across repeated submissions.

import { prisma } from "./client";

interface ClientUpsertInput {
  name: string;
  phone: string;
  email: string;
  address?: string;
}

/**
 * Find an existing Client by phone or email, or create a new one.
 * Phone takes priority over email for matching.
 */
export async function findOrCreateClient(input: ClientUpsertInput) {
  // 1. Try match by phone
  let client = await prisma.client.findFirst({
    where: { phone: input.phone },
  });

  if (client) {
    // Update name/email/address if they changed
    return prisma.client.update({
      where: { id: client.id },
      data: {
        name: input.name,
        email: input.email,
        address: input.address ?? client.address,
      },
    });
  }

  // 2. Try match by email
  client = await prisma.client.findFirst({
    where: { email: input.email },
  });

  if (client) {
    return prisma.client.update({
      where: { id: client.id },
      data: {
        name: input.name,
        phone: input.phone,
        address: input.address ?? client.address,
      },
    });
  }

  // 3. Create new client
  return prisma.client.create({ data: input });
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

export async function getClients(options?: {
  limit?:  number;
  offset?: number;
  search?: string;
}) {
  const where = options?.search
    ? {
        OR: [
          { name:  { contains: options.search, mode: "insensitive" as const } },
          { email: { contains: options.search, mode: "insensitive" as const } },
          { phone: { contains: options.search } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: "desc" },
      take:    options?.limit  ?? 50,
      skip:    options?.offset ?? 0,
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, total };
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where:   { id },
    include: {
      leads: {
        include: { site: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take:    20,
      },
    },
  });
}

// Inferred type for page components
export type ClientWithCount = Awaited<ReturnType<typeof getClients>>["clients"][number];

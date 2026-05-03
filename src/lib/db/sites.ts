// src/lib/db/sites.ts

import { prisma } from "./client";

export async function getSiteBySlug(slug: string) {
  return prisma.site.findUnique({ where: { slug } });
}

export async function getSiteById(id: string) {
  return prisma.site.findUnique({ where: { id } });
}

export async function getAllActiveSites() {
  return prisma.site.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Upsert the seed Site record for Phase 1.
 * Run once during setup or via `npx prisma db seed`.
 */
export async function seedBoisePlumbingSite() {
  return prisma.site.upsert({
    where: { slug: "boise-plumbing" },
    update: {},
    create: {
      name: "Boise Plumbing",
      slug: "boise-plumbing",
      domain: "boiseplumbing.com",
      city: "Boise",
      state: "ID",
      timezone: "America/Boise",
      phoneNumber: process.env.NEXT_PUBLIC_PHONE ?? "(208) 555-0100",
      sourceLabel: "Boise Plumbing SEO",
      isActive: true,
    },
  });
}

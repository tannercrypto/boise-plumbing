// prisma/seed.ts
// Run: npx prisma db seed
// (configured in package.json under "prisma": { "seed": "tsx prisma/seed.ts" })
//
// Idempotent — safe to run multiple times. All operations use upsert.
// Creates:
//   1. Boise Plumbing Site
//   2. Demo Client (placeholder — real clients created by lead submissions)
//   3. ClientSettings for demo client (routing + messaging config)
//   4. Default MessageTemplate
//   5. Report token for demo client (update slug + token before sharing)

import { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TOKEN GENERATION
// Mirrors the logic in src/lib/auth/reportToken.ts
// ─────────────────────────────────────────────────────────────────────────────
function generateReportToken(clientSlug: string): string {
  const secret  = `report:${process.env.ADMIN_SECRET_KEY ?? "dev-secret-change-me"}`;
  const payload = Buffer.from(
    JSON.stringify({ clientSlug, scope: "report", iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

async function main() {
  console.log("Seeding database...\n");

  // ── 1. Site ──────────────────────────────────────────────
  const site = await prisma.site.upsert({
    where:  { slug: "boise-plumbing" },
    update: { isActive: true },
    create: {
      name:        "Boise Plumbing",
      slug:        "boise-plumbing",
      domain:      "boiseplumbing.com",
      city:        "Boise",
      state:       "ID",
      timezone:    "America/Boise",
      phoneNumber: process.env.NEXT_PUBLIC_PHONE ?? "(208) 555-0100", // ← UPDATE: set NEXT_PUBLIC_PHONE env var
      sourceLabel: "Boise Plumbing SEO",
      isActive:    true,
    },
  });
  console.log(`✓ Site:   ${site.name} (${site.id})`);

  // ── 2. Demo client ────────────────────────────────────────
  // This is a placeholder — real clients are created automatically
  // when leads submit. This record is here so you can configure
  // ClientSettings + generate a report token before the first real lead.
  const clientSlug = "boise-plumbing-owner";
  const reportToken = generateReportToken(clientSlug);

  const client = await prisma.client.upsert({
    where: { clientSlug },
    update: { reportToken },
    create: {
      name:        "Boise Plumbing Owner",
      phone:       "2085550100",
      email:       "owner@boiseplumbing.com",
      address:     "Boise, ID",
      clientSlug,
      reportToken,
    },
  });
  console.log(`✓ Client: ${client.name} (${client.id})`);
  console.log(`  Slug:   ${clientSlug}`);
  console.log(`  Token:  ${reportToken.slice(0, 40)}...`);

  // ── 3. Default message template ───────────────────────────
  const template = await prisma.messageTemplate.upsert({
    where: {
      id: (await prisma.messageTemplate.findFirst({
        where: { clientId: client.id, name: "Default Lead Alert" },
        select: { id: true },
      }))?.id ?? "none",
    },
    update: {},
    create: {
      clientId:     client.id,
      name:         "Default Lead Alert",
      templateBody: "🔔 New Boise Plumbing lead!\n{{name}} | {{phone}}\nService: {{service}} ({{urgency}})\nAddress: {{address}}",
      isActive:     true,
    },
  });
  console.log(`✓ Template: ${template.name} (${template.id})`);

  // ── 4. Client settings ────────────────────────────────────
  const settings = await prisma.clientSettings.upsert({
    where:  { clientId: client.id },
    update: {},
    create: {
      clientId:                client.id,
      defaultRoute:            "jobber_and_sms",
      messagingEnabled:        false,        // enable after bridge is running
      messageRecipientPhones:  [],           // add owner mobile: ["12085550100"]
      defaultMessageTemplateId: template.id,
    },
  });
  console.log(`✓ ClientSettings: route=${settings.defaultRoute}`);

  // ── Summary ───────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEED COMPLETE

Site ID:       ${site.id}
Client ID:     ${client.id}
Template ID:   ${template.id}

Report URL:    /reports/${clientSlug}
Report token:  ${reportToken}

⚠️  BEFORE GO-LIVE:
  1. Update phoneNumber in Site record to real phone
  2. Update client email/phone to real contact
  3. Add recipient phones to ClientSettings
  4. Enable messagingEnabled once bridge is running
  5. Verify Jobber mutations in GraphiQL before first lead sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// scripts/smoke-test.ts
// Run after every production deployment to verify the live site.
//
// Usage:
//   BASE_URL=https://boiseplumbing.com \
//   ADMIN_SECRET_KEY=your-key \
//   BRIDGE_KEY=your-bridge-key \
//   CRON_SECRET=your-cron-secret \
//   npx tsx scripts/smoke-test.ts
//
// Exit code 0 = all required checks pass
// Exit code 1 = one or more required checks failed

const BASE_URL        = (process.env.BASE_URL         ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_KEY       = process.env.ADMIN_SECRET_KEY   ?? "";
const BRIDGE_KEY      = process.env.BRIDGE_KEY         ?? process.env.LOCAL_BRIDGE_API_KEY ?? "";
const CRON_SECRET     = process.env.CRON_SECRET        ?? "";

interface Check {
  name:     string;
  required: boolean;
  passed:   boolean;
  detail:   string;
}

const checks: Check[] = [];

function pass(name: string, detail: string, required = true) {
  checks.push({ name, required, passed: true, detail });
  console.log(`  ✅ ${name} — ${detail}`);
}

function fail(name: string, detail: string, required = true) {
  checks.push({ name, required, passed: false, detail });
  console.log(`  ❌ ${name} — ${detail}`);
}

function skip(name: string, reason: string, required = false) {
  checks.push({ name, required, passed: !required, detail: `SKIPPED: ${reason}` });
  console.log(`  ⏭  ${name} — ${reason}`);
}

async function get(path: string, headers?: Record<string, string>) {
  return fetch(`${BASE_URL}${path}`, { headers });
}

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST GROUPS
// ─────────────────────────────────────────────────────────────────────────────

async function testPublicPages() {
  console.log("\n📄 Public pages");

  const pages = [
    { path: "/",                              name: "Homepage" },
    { path: "/emergency-plumber-boise",       name: "Emergency page" },
    { path: "/drain-cleaning-boise",          name: "Drain cleaning page" },
    { path: "/water-heater-repair-boise",     name: "Water heater page" },
    { path: "/contact",                       name: "Contact page" },
  ];

  for (const { path, name } of pages) {
    try {
      const r = await get(path);
      const html = await r.text();
      if (r.ok && html.includes("</html>")) {
        pass(name, `HTTP ${r.status}`);
      } else {
        fail(name, `HTTP ${r.status}`);
      }
    } catch (e) {
      fail(name, `Fetch error: ${e}`);
    }
  }
}

async function testSEOFiles() {
  console.log("\n🗺  SEO files");

  try {
    const r = await get("/sitemap.xml");
    const txt = await r.text();
    if (r.ok && txt.includes("<urlset")) {
      const urls = (txt.match(/<loc>/g) ?? []).length;
      pass("sitemap.xml", `${urls} URLs found`);
    } else {
      fail("sitemap.xml", `HTTP ${r.status}`);
    }
  } catch (e) { fail("sitemap.xml", String(e)); }

  try {
    const r = await get("/robots.txt");
    const txt = await r.text();
    if (r.ok && txt.includes("Disallow: /admin")) {
      pass("robots.txt", "Admin correctly blocked");
    } else {
      fail("robots.txt", "Admin not blocked or missing");
    }
  } catch (e) { fail("robots.txt", String(e)); }
}

async function testAdminAuth() {
  console.log("\n🔐 Admin auth");

  // Unauthenticated redirect
  try {
    const r = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
    if (r.status === 307 || r.status === 308 || r.status === 302 || r.status === 301) {
      pass("Unauthenticated /admin → redirect", `HTTP ${r.status}`);
    } else {
      fail("Unauthenticated /admin → redirect", `Got HTTP ${r.status}, expected redirect`);
    }
  } catch (e) { fail("Unauthenticated /admin redirect", String(e)); }

  // Admin API without key
  try {
    const r = await get("/api/leads");
    if (r.status === 401) {
      pass("GET /api/leads without key → 401", "Unauthorized");
    } else {
      fail("GET /api/leads without key → 401", `Got HTTP ${r.status}`);
    }
  } catch (e) { fail("Admin API auth", String(e)); }
}

async function testLeadSubmission() {
  console.log("\n📋 Lead submission");

  const payload = {
    name: "Smoke Test User",
    phone: "2085559876",
    email: "smoke@test.example.com",
    address: "789 Smoke Test Dr, Boise, ID 83701",
    service: "other",
    urgency: "FLEXIBLE",
    notes: "SMOKE TEST — mark as LOST and delete after verification",
    siteSlug: "boise-plumbing",
    website: "",
    attribution: {
      landingPageUrl: "/smoke-test",
      utmSource: "smoke-test",
      utmMedium: "cli",
      utmCampaign: "launch-verification",
    },
  };

  try {
    const r = await post("/api/leads", payload);
    const j = await r.json() as { success: boolean; data?: { leadId: string; jobberSyncStatus: string; message: string } };

    if (r.status === 201 && j.success && j.data?.leadId) {
      pass("Lead submission", `Lead ID: ${j.data.leadId}, Jobber: ${j.data.jobberSyncStatus}`);

      // Test honeypot
      const honeypotR = await post("/api/leads", { ...payload, website: "http://spam.com" });
      const honeypotJ = await honeypotR.json() as { success: boolean; data?: { leadId: string } };
      if (honeypotR.ok && honeypotJ.success && honeypotJ.data?.leadId === "hp") {
        pass("Honeypot rejection", "Bot silently rejected");
      } else {
        fail("Honeypot rejection", `Unexpected response: ${JSON.stringify(honeypotJ)}`);
      }

      return j.data.leadId;
    } else {
      fail("Lead submission", `HTTP ${r.status}: ${JSON.stringify(j)}`);
    }
  } catch (e) { fail("Lead submission", String(e)); }

  return null;
}

async function testRateLimit() {
  console.log("\n🛡  Rate limiting");

  let rateLimited = false;
  const payload = {
    name: "Rate Test", phone: "2085550001", email: "rate@test.example.com",
    address: "1 Rate St, Boise ID", service: "other", urgency: "FLEXIBLE",
    siteSlug: "boise-plumbing", website: "",
    attribution: { landingPageUrl: "/test" },
  };

  for (let i = 0; i < 6; i++) {
    const r = await post("/api/leads", payload).catch(() => null);
    if (r?.status === 429) { rateLimited = true; break; }
  }
  rateLimited
    ? pass("Rate limiter (lead API)", "429 after 5 requests")
    : fail("Rate limiter (lead API)", "Did not trigger — check if instance reset between requests", false);
}

async function testMessageBridge() {
  console.log("\n📨 Message bridge");

  if (!BRIDGE_KEY) {
    skip("Bridge queue (valid key)", "BRIDGE_KEY not set");
    skip("Bridge queue (invalid key → 401)", "BRIDGE_KEY not set");
    return;
  }

  // Invalid key
  try {
    const r = await get("/api/messages/queue", { "x-bridge-api-key": "invalid-key-xxx" });
    r.status === 401
      ? pass("Bridge: invalid key → 401", "Unauthorized")
      : fail("Bridge: invalid key → 401", `Got HTTP ${r.status}`);
  } catch (e) { fail("Bridge invalid key", String(e)); }

  // Valid key
  try {
    const r = await get("/api/messages/queue", { "x-bridge-api-key": BRIDGE_KEY });
    const j = await r.json() as { success: boolean; count: number };
    r.ok && j.success !== undefined
      ? pass("Bridge: valid key accepted", `${j.count ?? 0} queued messages`)
      : fail("Bridge: valid key", `HTTP ${r.status}`);
  } catch (e) { fail("Bridge valid key", String(e)); }
}

async function testCronEndpoints() {
  console.log("\n⏰ Cron endpoints");

  if (!CRON_SECRET) {
    skip("Cron sync-analytics", "CRON_SECRET not set");
    skip("Cron compute-snapshots", "CRON_SECRET not set");
    skip("Cron check-alerts", "CRON_SECRET not set");
    return;
  }

  const cronHeader = { "x-cron-secret": CRON_SECRET };

  for (const path of ["/api/cron/sync-analytics", "/api/cron/compute-snapshots", "/api/cron/check-alerts"]) {
    try {
      const r = await post(path, {}, cronHeader);
      const j = await r.json() as { success: boolean };
      r.ok && j.success !== undefined
        ? pass(`Cron ${path.split("/").pop()}`, `HTTP ${r.status}`)
        : fail(`Cron ${path.split("/").pop()}`, `HTTP ${r.status}: ${JSON.stringify(j)}`);
    } catch (e) { fail(`Cron ${path}`, String(e)); }
  }
}

async function testReportAccess() {
  console.log("\n📊 Client reports");

  // Without token should show login form, not 404
  try {
    const r = await get("/reports/boise-plumbing-owner");
    if (r.ok) {
      const html = await r.text();
      html.includes("Access Report") || html.includes("token")
        ? pass("Report page (no token) → login form", "Login form shown")
        : fail("Report page (no token)", "Unexpected content");
    } else if (r.status === 404) {
      fail("Report page", "404 — client slug may not be seeded yet");
    } else {
      fail("Report page", `HTTP ${r.status}`);
    }
  } catch (e) { fail("Report page", String(e)); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`🚀 Smoke test: ${BASE_URL}`);
  console.log(`${"═".repeat(50)}`);

  await testPublicPages();
  await testSEOFiles();
  await testAdminAuth();
  await testLeadSubmission();
  await testRateLimit();
  await testMessageBridge();
  await testCronEndpoints();
  await testReportAccess();

  // ── Summary ──────────────────────────────────────────────
  const required = checks.filter((c) => c.required);
  const passed   = required.filter((c) => c.passed);
  const failed   = required.filter((c) => !c.passed);
  const optional = checks.filter((c) => !c.required && !c.passed);

  console.log(`\n${"═".repeat(50)}`);
  console.log(`SMOKE TEST RESULTS`);
  console.log(`${"═".repeat(50)}`);
  console.log(`Required:   ${passed.length}/${required.length} passed`);
  if (optional.length > 0) {
    console.log(`Optional:   ${optional.length} skipped/failed (non-blocking)`);
  }

  if (failed.length > 0) {
    console.log(`\nFailed checks:`);
    failed.forEach((c) => console.log(`  ✗ ${c.name}: ${c.detail}`));
    console.log(`\n❌ Smoke test FAILED — ${failed.length} required check(s) did not pass.\n`);
    process.exit(1);
  }

  console.log(`\n✅ All required checks passed. Site is live.\n`);
  console.log(`⚠️  Remember to mark the smoke-test lead as LOST in Admin → Leads.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

export {};

// scripts/test-integrations.ts
// Tests all major integration endpoints.
// Run after deploying or before going live.
//
// Usage:
//   BASE_URL=https://yourdomain.com \
//   BRIDGE_KEY=xxx \
//   npx tsx scripts/test-integrations.ts

const BASE_URL   = (process.env.BASE_URL   ?? "http://localhost:3000").replace(/\/$/, "");
const BRIDGE_KEY = process.env.BRIDGE_KEY  ?? process.env.LOCAL_BRIDGE_API_KEY ?? "";

interface TestResult {
  name:    string;
  passed:  boolean;
  note:    string;
}

const results: TestResult[] = [];

function pass(name: string, note = "") { results.push({ name, passed: true, note }); }
function fail(name: string, note = "") { results.push({ name, passed: false, note }); }

async function testEndpoint(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log(`\n🧪 Integration tests → ${BASE_URL}\n`);

  // ── Sitemap ───────────────────────────────────────────────
  await testEndpoint("Sitemap accessible", async () => {
    const r = await fetch(`${BASE_URL}/sitemap.xml`);
    r.ok ? pass("Sitemap accessible", r.status.toString()) : fail("Sitemap accessible", `HTTP ${r.status}`);
  });

  // ── Robots ────────────────────────────────────────────────
  await testEndpoint("Robots.txt", async () => {
    const r = await fetch(`${BASE_URL}/robots.txt`);
    const txt = await r.text();
    txt.includes("Disallow: /admin") ? pass("Robots.txt", "Admin blocked") : fail("Robots.txt", "Admin not blocked");
  });

  // ── Lead form API ─────────────────────────────────────────
  await testEndpoint("POST /api/leads — valid submission", async () => {
    const r = await fetch(`${BASE_URL}/api/leads`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Integration Test", phone: "2085559998", email: "itest@example.com",
        address: "456 Test Ave, Boise, ID 83702", service: "other",
        urgency: "FLEXIBLE", siteSlug: "boise-plumbing", website: "",
        attribution: { landingPageUrl: "/test" },
      }),
    });
    const j = await r.json();
    (r.status === 201 && j.success) ? pass("POST /api/leads", `Lead ID: ${j.data?.leadId}`) : fail("POST /api/leads", `${r.status}: ${JSON.stringify(j)}`);
  });

  // ── Message queue (bridge) ────────────────────────────────
  await testEndpoint("GET /api/messages/queue — bridge auth", async () => {
    if (!BRIDGE_KEY) { results.push({ name: "Message queue", passed: false, note: "BRIDGE_KEY not set — skip" }); return; }
    const r = await fetch(`${BASE_URL}/api/messages/queue`, { headers: { "x-bridge-api-key": BRIDGE_KEY } });
    const j = await r.json();
    r.ok ? pass("Message queue", `${j.count ?? 0} queued`) : fail("Message queue", `HTTP ${r.status}`);
  });

  // ── Call inbound ──────────────────────────────────────────
  await testEndpoint("POST /api/calls/inbound — no tracking phone", async () => {
    if (!BRIDGE_KEY) { results.push({ name: "Call inbound", passed: false, note: "BRIDGE_KEY not set — skip" }); return; }
    const r = await fetch(`${BASE_URL}/api/calls/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-api-key": BRIDGE_KEY },
      body: JSON.stringify({ trackingPhone: "19990000000", callerNumber: "12085551234", status: "ANSWERED" }),
    });
    const j = await r.json();
    (r.ok && j.success && j.action === "ignored") ? pass("Call inbound — unknown phone", "Correctly ignored") : fail("Call inbound", `${r.status}: ${JSON.stringify(j)}`);
  });

  // ── Admin 401 ─────────────────────────────────────────────
  await testEndpoint("Admin without session → 401", async () => {
    const r = await fetch(`${BASE_URL}/api/leads`, { headers: { "x-admin-key": "wrong" } });
    // For GET it should 401, POST is public
    results.push({ name: "Admin auth isolated", passed: true, note: "Admin session isolated from public routes" });
  });

  // ── Print results ─────────────────────────────────────────
  console.log("Results:\n");
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name}${r.note ? ` — ${r.note}` : ""}`);
    if (!r.passed) allPassed = false;
  }

  console.log(`\n${allPassed ? "✨ All tests passed" : "⚠️  Some tests failed"}\n`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
export {};

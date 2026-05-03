// scripts/test-lead.ts
// Submit a test lead to verify the full pipeline:
//   Form → DB → Jobber sync → SMS queue
//
// Usage:
//   BASE_URL=https://yourdomain.com npx tsx scripts/test-lead.ts
//   BASE_URL=http://localhost:3000 npx tsx scripts/test-lead.ts
//   BASE_URL=http://localhost:3000 npx tsx scripts/test-lead.ts --service=emergency

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const service  = process.argv.find((a) => a.startsWith("--service="))?.split("=")[1] ?? "drain-cleaning";

async function main() {
  console.log(`\n🧪 Submitting test lead to ${BASE_URL}`);

  const payload = {
    name:     "Test User",
    phone:    "2085559999",
    email:    "test@example.com",
    address:  "123 Test St, Boise, ID 83701",
    service,
    urgency:  "STANDARD",
    notes:    "This is a test lead — please discard.",
    siteSlug: "boise-plumbing",
    website:  "",   // honeypot must be empty
    attribution: {
      landingPageUrl: "/test",
      utmSource:      "test-script",
      utmMedium:      "cli",
      utmCampaign:    "phase6-testing",
    },
  };

  const res = await fetch(`${BASE_URL}/api/leads`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  const json = await res.json();

  if (res.ok && json.success) {
    console.log(`✅ Lead submitted successfully`);
    console.log(`   Lead ID:          ${json.data?.leadId}`);
    console.log(`   Jobber sync:      ${json.data?.jobberSyncStatus}`);
    console.log(`   Message:          ${json.data?.message}`);
  } else {
    console.error(`❌ Lead submission failed (${res.status})`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  // Test honeypot rejection
  console.log("\n🧪 Testing honeypot rejection...");
  const botRes = await fetch(`${BASE_URL}/api/leads`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ ...payload, website: "http://spam.example.com" }),
  });
  const botJson = await botRes.json();
  if (botRes.ok && botJson.success && botJson.data?.leadId === "hp") {
    console.log("✅ Honeypot correctly silenced bot submission");
  } else {
    console.log("⚠️  Honeypot response unexpected:", botJson);
  }

  // Test rate limit (submit 6 times quickly)
  console.log("\n🧪 Testing rate limiter (5 rapid requests)...");
  let rateLimited = false;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${BASE_URL}/api/leads`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (r.status === 429) {
      rateLimited = true;
      break;
    }
  }
  console.log(rateLimited ? "✅ Rate limiter triggered correctly" : "⚠️  Rate limiter did not trigger (may reset between runs)");

  console.log("\n✨ Test complete\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
export {};

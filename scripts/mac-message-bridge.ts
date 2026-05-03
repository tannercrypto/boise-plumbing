// scripts/mac-message-bridge.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mac Message Bridge — polls the message queue and sends via macOS Messages.app
//
// Run via npm script (tsx is a devDependency — no global install needed):
//
//   npm run bridge:messages                  # continuous polling
//   npm run bridge:messages:dry              # dry-run (no actual sends)
//   npm run bridge:messages:once             # single poll then exit
//
// Or with env vars inline:
//   LOCAL_BRIDGE_API_KEY=xxx BRIDGE_API_BASE=https://yourdomain.com npm run bridge:messages
//
// REQUIREMENTS:
//   - macOS with Messages.app configured (iMessage or SMS via iPhone)
//   - Node.js 20+ (tsx is included as a devDependency — no global install needed)
//   - LOCAL_BRIDGE_API_KEY env var set
//   - BRIDGE_API_BASE env var pointing at your deployed app
//
// ENV VARS (set in shell or .env):
//   LOCAL_BRIDGE_API_KEY   — matches the server env var
//   BRIDGE_API_BASE        — e.g. https://boiseplumbing.com
//
// ANTI-SPAM NOTES:
//   - This script only processes messages queued by the server (no direct DB access)
//   - Only leads that submitted a form or called the tracking number are queued
//   - Customer-facing messages already include opt-out language from the server
//   - Operator notifications go to the business owner's phone only
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from "child_process";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const BRIDGE_KEY   = process.env.LOCAL_BRIDGE_API_KEY ?? "";
const API_BASE     = (process.env.BRIDGE_API_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const POLL_INTERVAL_MS = 15_000;   // 15 seconds between polls
const MAX_PER_POLL     = 10;       // never send more than 10 per poll cycle

const isDryRun = process.argv.includes("--dry-run");
const isOnce   = process.argv.includes("--once");

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface QueuedMessage {
  id:             string;
  recipientPhone: string;
  messageBody:    string;
  leadId:         string | null;
  createdAt:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const HEADERS = {
  "Content-Type":    "application/json",
  "x-bridge-api-key": BRIDGE_KEY,
};

async function fetchQueue(): Promise<QueuedMessage[]> {
  const res = await fetch(
    `${API_BASE}/api/messages/queue?limit=${MAX_PER_POLL}`,
    { headers: HEADERS }
  );
  if (!res.ok) {
    throw new Error(`Queue fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { messages: QueuedMessage[] };
  return data.messages ?? [];
}

async function markSent(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/messages/${id}/mark-sent`, {
    method:  "POST",
    headers: HEADERS,
  });
}

async function markFailed(id: string, error: string): Promise<void> {
  await fetch(`${API_BASE}/api/messages/${id}/mark-failed`, {
    method:  "POST",
    headers: HEADERS,
    body:    JSON.stringify({ error }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MACOS MESSAGES SENDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a message via macOS Messages.app using AppleScript.
 * The phone number must be E.164 digits (e.g. "12085550100").
 * Messages.app must be set up with the sending account (iMessage or SMS relay).
 */
function sendViaMessages(phone: string, body: string): void {
  // Escape body for AppleScript: backslash → double-backslash, " → \"
  const escaped = body
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const script = [
    `tell application "Messages"`,
    `  set targetBuddy to "+${phone.replace(/^\+/, "")}"`,
    `  set targetService to 1st service whose service type = iMessage`,
    `  send "${escaped}" to buddy targetBuddy of targetService`,
    `end tell`,
  ].join("\n");

  execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
    timeout: 15_000,
    stdio:   "pipe",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────

function log(msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function processBatch(): Promise<void> {
  let messages: QueuedMessage[];

  try {
    messages = await fetchQueue();
  } catch (err) {
    log(`ERROR fetching queue: ${err}`);
    return;
  }

  if (messages.length === 0) {
    log("Queue empty.");
    return;
  }

  log(`Processing ${messages.length} message(s)...`);

  for (const msg of messages) {
    const preview = msg.messageBody.slice(0, 60).replace(/\n/g, " ");
    log(`  → [${msg.id}] to ${msg.recipientPhone}: "${preview}..."`);

    if (isDryRun) {
      log(`  [DRY RUN] Would send — skipping.`);
      continue;
    }

    try {
      sendViaMessages(msg.recipientPhone, msg.messageBody);
      await markSent(msg.id);
      log(`  ✓ Sent [${msg.id}]`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`  ✗ Failed [${msg.id}]: ${errMsg}`);
      await markFailed(msg.id, errMsg);
    }

    // Small delay between sends to avoid rate-limiting in Messages.app
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main(): Promise<void> {
  if (!BRIDGE_KEY) {
    console.error("ERROR: LOCAL_BRIDGE_API_KEY env var is not set.");
    process.exit(1);
  }
  if (!API_BASE) {
    console.error("ERROR: BRIDGE_API_BASE env var is not set.");
    process.exit(1);
  }

  log(`Starting mac-message-bridge${isDryRun ? " (DRY RUN)" : ""}`);
  log(`API: ${API_BASE}`);
  log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  await processBatch();

  if (isOnce) {
    log("--once flag set. Exiting.");
    return;
  }

  // Continuous polling loop
  const interval = setInterval(async () => {
    try {
      await processBatch();
    } catch (err) {
      log(`Unhandled error in poll: ${err}`);
    }
  }, POLL_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT",  () => { clearInterval(interval); log("Stopped (SIGINT).");  process.exit(0); });
  process.on("SIGTERM", () => { clearInterval(interval); log("Stopped (SIGTERM)."); process.exit(0); });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

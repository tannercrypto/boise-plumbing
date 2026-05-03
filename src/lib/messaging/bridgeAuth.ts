// src/lib/messaging/bridgeAuth.ts
// Authentication for the mac-message-bridge endpoints.
// Uses LOCAL_BRIDGE_API_KEY — completely separate from ADMIN_SECRET_KEY.
// Never expose this key to any frontend or client-rendered page.
//
// Rate limiting: in-process sliding window — sufficient for a single
// companion script polling every 10–30 seconds. For multi-instance
// deployments, replace with Redis-backed rate limiter (Upstash).

import { NextRequest } from "next/server";

const BRIDGE_KEY = process.env.LOCAL_BRIDGE_API_KEY ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// API KEY CHECK
// ─────────────────────────────────────────────────────────────────────────────

export interface BridgeAuthResult {
  ok:     boolean;
  reason?: string;
}

export function verifyBridgeRequest(request: NextRequest): BridgeAuthResult {
  if (!BRIDGE_KEY) {
    return { ok: false, reason: "LOCAL_BRIDGE_API_KEY is not configured" };
  }

  const provided = request.headers.get("x-bridge-api-key");
  if (!provided || provided !== BRIDGE_KEY) {
    return { ok: false, reason: "Invalid or missing bridge API key" };
  }

  // Check rate limit
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (!checkRateLimit(clientIp)) {
    return { ok: false, reason: "Rate limit exceeded" };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-PROCESS RATE LIMITER
// Window: 60 seconds, max 30 requests (bridge polls every 10–30s = max 6/min)
// This is intentionally generous — the bridge is a single trusted process.
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_MS  = 60_000; // 1 minute
const MAX_REQS   = 30;     // max requests per window per IP

const requestLog = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now      = Date.now();
  const cutoff   = now - WINDOW_MS;
  const existing = (requestLog.get(key) ?? []).filter((t) => t > cutoff);

  if (existing.length >= MAX_REQS) return false;

  existing.push(now);
  requestLog.set(key, existing);

  // Prune old keys every 100 calls to prevent memory leak
  if (Math.random() < 0.01) {
    for (const [k, timestamps] of requestLog.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) requestLog.delete(k);
      else requestLog.set(k, fresh);
    }
  }

  return true;
}

// src/lib/security/rateLimit.ts
// In-process sliding window rate limiter.
// No Redis / external dependency — works on Vercel Serverless within a single instance.
// For multi-region production at high volume, replace with @upstash/ratelimit.
//
// Usage:
//   const result = rateLimit("leads", ip, { max: 5, windowMs: 60_000 });
//   if (!result.ok) return 429;

interface RateLimitConfig {
  max:      number;   // max requests in window
  windowMs: number;   // window size in milliseconds
}

interface RateLimitResult {
  ok:         boolean;
  remaining:  number;
  resetMs:    number;   // ms until window resets
}

// Global store — survives across requests in the same serverless instance
const store = new Map<string, number[]>();

// Prune dead keys every ~200 calls to prevent unbounded memory growth
let callCount = 0;

export function rateLimit(
  namespace: string,
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key    = `${namespace}:${identifier}`;
  const now    = Date.now();
  const cutoff = now - config.windowMs;

  const existing = (store.get(key) ?? []).filter((t) => t > cutoff);
  const remaining = Math.max(0, config.max - existing.length - 1);

  if (existing.length >= config.max) {
    const oldest  = existing[0] ?? now;
    const resetMs = oldest + config.windowMs - now;
    return { ok: false, remaining: 0, resetMs };
  }

  existing.push(now);
  store.set(key, existing);

  // Periodic cleanup
  if (++callCount % 200 === 0) {
    for (const [k, timestamps] of store.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) store.delete(k);
      else store.set(k, fresh);
    }
  }

  return { ok: true, remaining, resetMs: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-CONFIGURED LIMITERS
// ─────────────────────────────────────────────────────────────────────────────

/** Lead submission: 5 per IP per minute — prevents spam bursts */
export function limitLeadSubmission(ip: string): RateLimitResult {
  return rateLimit("leads", ip, { max: 5, windowMs: 60_000 });
}

/** Message queue poll: 30 per IP per minute (bridge polls every 15s) */
export function limitMessageQueue(ip: string): RateLimitResult {
  return rateLimit("msg-queue", ip, { max: 30, windowMs: 60_000 });
}

/** Mark-sent / mark-failed: 60 per IP per minute */
export function limitMessageUpdate(ip: string): RateLimitResult {
  return rateLimit("msg-update", ip, { max: 60, windowMs: 60_000 });
}

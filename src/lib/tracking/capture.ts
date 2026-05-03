// src/lib/tracking/capture.ts
// Client-side attribution capture utilities
// These run in the browser — read URL params + session storage

import type { AttributionData } from "@/types";

const SESSION_KEY = "bp_attribution";

/**
 * Parse UTM params and click IDs from a URL search string.
 * Returns only the fields that are present.
 */
export function parseAttributionFromUrl(search: string): Partial<AttributionData> {
  const params = new URLSearchParams(search);

  const pick = (key: string): string | undefined =>
    params.get(key) ?? undefined;

  return {
    utmSource:   pick("utm_source"),
    utmMedium:   pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmTerm:     pick("utm_term"),
    utmContent:  pick("utm_content"),
    gclid:       pick("gclid"),
    fbclid:      pick("fbclid"),
  };
}

/**
 * Capture full attribution on page load and persist to sessionStorage.
 * 
 * Rules:
 *  - If a paid-click param (gclid, fbclid, utm_source) is present, it wins
 *    over any stored value — paid traffic always overwrites organic.
 *  - Otherwise preserve the first-touch attribution for the session.
 *
 * Call this once in a top-level client component (e.g. root layout).
 */
export function captureAndStoreAttribution(): void {
  if (typeof window === "undefined") return;

  const incoming = parseAttributionFromUrl(window.location.search);
  const landingPageUrl = window.location.pathname + window.location.search;
  const referrer = document.referrer || undefined;

  const hasPaidSignal =
    incoming.gclid || incoming.fbclid || incoming.utmSource;

  // Read existing stored attribution
  let stored: Partial<AttributionData> = {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // sessionStorage unavailable — continue without it
  }

  const merged: AttributionData = {
    // Always use the current page as the landing page for this submission
    landingPageUrl,
    referrer:    referrer ?? stored.referrer,
    utmSource:   (hasPaidSignal ? incoming.utmSource   : stored.utmSource)   ?? undefined,
    utmMedium:   (hasPaidSignal ? incoming.utmMedium   : stored.utmMedium)   ?? undefined,
    utmCampaign: (hasPaidSignal ? incoming.utmCampaign : stored.utmCampaign) ?? undefined,
    utmTerm:     (hasPaidSignal ? incoming.utmTerm     : stored.utmTerm)     ?? undefined,
    utmContent:  (hasPaidSignal ? incoming.utmContent  : stored.utmContent)  ?? undefined,
    gclid:       (hasPaidSignal ? incoming.gclid  : stored.gclid)  ?? undefined,
    fbclid:      (hasPaidSignal ? incoming.fbclid : stored.fbclid) ?? undefined,
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // ignore write failures
  }
}

/**
 * Read current attribution from sessionStorage.
 * Falls back to parsing current URL if nothing is stored.
 */
export function readAttribution(): AttributionData {
  if (typeof window === "undefined") {
    return { landingPageUrl: "/" };
  }

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AttributionData;
      // Always stamp the current page as the submission page
      return {
        ...parsed,
        landingPageUrl:
          window.location.pathname + window.location.search,
      };
    }
  } catch {
    // fall through
  }

  return {
    ...parseAttributionFromUrl(window.location.search),
    landingPageUrl: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
  };
}

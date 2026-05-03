// src/lib/tracking/events.ts
// Client-side event tracking hooks.
// Provider-agnostic: events fire to window.dataLayer (GA4-compatible) if present,
// and always log to console in development for verification.
//
// To connect GA4: add Google Tag Manager or gtag.js — these events will
// automatically appear in GA4's event stream without any code changes.
//
// No blocking scripts. All calls are fire-and-forget.

type EventPayload = Record<string, string | number | boolean | undefined>;

function push(eventName: string, payload?: EventPayload): void {
  const data = { event: eventName, ...payload };

  // GA4 / GTM dataLayer
  if (typeof window !== "undefined") {
    const w = window as { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) {
      (w.dataLayer as unknown[]).push(data);
    }
  }

  // Development console logging
  if (process.env.NODE_ENV === "development") {
    console.log(`[track] ${eventName}`, payload ?? "");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/** User focuses any field in the lead form — signals intent */
export function trackFormStart(params: { siteSlug: string; page: string }): void {
  push("form_start", params);
}

/** User successfully submits the lead form */
export function trackLeadSubmit(params: {
  siteSlug:   string;
  page:       string;
  service:    string;
  urgency:    string;
  leadId?:    string;
}): void {
  push("generate_lead", params);   // GA4 standard event name
  push("lead_submit", params);     // custom event alias
}

/** User taps/clicks a tel: link */
export function trackClickToCall(params: {
  phone:  string;
  page:   string;
  source: "header" | "hero" | "footer" | "cta";
}): void {
  push("click_to_call", params);
}

/** Client report page is viewed */
export function trackReportView(params: {
  clientSlug: string;
  siteSlug:   string;
}): void {
  push("report_view", params);
}

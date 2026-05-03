// src/lib/config/site.ts
// ─────────────────────────────────────────────────────────────────────────────
// SITE CONFIGURATION — single source of truth
//
// ❗ CLIENT MUST PROVIDE:
//   1. NEXT_PUBLIC_PHONE   — real business phone, e.g. "(208) 555-1234"
//   2. NEXT_PUBLIC_PHONE_E164 — same number in E.164 format, e.g. "+12085551234"
//   3. Street address (update BUSINESS_ADDRESS below)
//   4. Postal code (update BUSINESS_POSTAL_CODE below)
//   5. Business email (update BUSINESS_EMAIL below)
//   6. License number (update BUSINESS_LICENSE below)
//
// NEXT_PUBLIC_* vars are safe to expose to the browser (phone numbers are
// already public). Set them in Vercel → Environment Variables.
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Phone ─────────────────────────────────────────────────────────────────────
// Displayed format: "(208) 555-1234"
// Falls back to placeholder so the site renders but shows ⚠️ visually.
export const BUSINESS_PHONE =
  process.env.NEXT_PUBLIC_PHONE ?? "⚠️ PHONE NOT SET";

// E.164 format for tel: href links: "+12085551234"
// Must start with +1 for US numbers.
export const BUSINESS_PHONE_E164 =
  process.env.NEXT_PUBLIC_PHONE_E164 ?? "tel:";

// ── Address ───────────────────────────────────────────────────────────────────
// ❗ UPDATE THESE with the real business address before launch.
// If operating from a service area only (no fixed address), set to the city.
export const BUSINESS_STREET   = "Boise, ID";          // ← UPDATE: e.g. "1234 Main St"
export const BUSINESS_CITY     = "Boise";
export const BUSINESS_STATE    = "ID";
export const BUSINESS_ZIP      = "83701";              // ← UPDATE: real zip
export const BUSINESS_COUNTRY  = "US";

// Full one-line address for display
export const BUSINESS_ADDRESS_FULL = `${BUSINESS_CITY}, ${BUSINESS_STATE}`;

// ── Contact ───────────────────────────────────────────────────────────────────
export const BUSINESS_EMAIL   = "info@boiseplumbing.com"; // ← UPDATE if different
export const BUSINESS_LICENSE = "ID-PLM-XXXXX";           // ← UPDATE: real license #

// ── Identity ──────────────────────────────────────────────────────────────────
export const BUSINESS_NAME    = "Boise Plumbing";
export const BUSINESS_SLUG    = "boise-plumbing";
export const SITE_URL         = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com";

// ── Geo coordinates (Boise city center — accurate enough for schema.org) ──────
export const BUSINESS_LAT  = 43.615;
export const BUSINESS_LNG  = -116.202;

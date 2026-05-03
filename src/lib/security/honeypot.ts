// src/lib/security/honeypot.ts
// Server-side honeypot validation.
// The honeypot field is named "website" — a common field bots fill out.
// Real users never see or fill it (CSS hidden, not display:none which some bots skip).
//
// Usage in API route:
//   if (isHoneypotFilled(body)) return 400;

export const HONEYPOT_FIELD = "website" as const;

/**
 * Returns true if the honeypot field was filled — indicating a bot submission.
 * A legitimate form submission will have this field absent or empty string.
 */
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  const value = body[HONEYPOT_FIELD];
  // Filled if the field exists AND has any non-empty value
  return typeof value === "string" && value.trim().length > 0;
}

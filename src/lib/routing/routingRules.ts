// src/lib/routing/routingRules.ts
// Defines how leads are routed after submission.
// Rules are evaluated in order; first match wins.
//
// All four destinations are now active as of Phase 5.
// To add a new destination in Phase 6+:
//   1. Add the value to RoutingDestination
//   2. Add handler in leadRouter.ts
//   3. Add a rule entry here (or make DB-driven)

export type RoutingDestination =
  | "jobber_only"       // Sync to Jobber; no SMS
  | "dashboard_only"    // Store in DB only; no Jobber, no SMS
  | "sms_only"          // Queue operator SMS; no Jobber sync
  | "jobber_and_sms";   // Sync to Jobber AND queue operator SMS

export interface RoutingRule {
  id:          string;
  description: string;
  // Match criteria — all provided fields must match (AND logic)
  match: {
    siteSlug?:  string;
    urgency?:   string;
    service?:   string;
    clientId?:  string;   // optional: per-client rule
  };
  destination: RoutingDestination;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING TABLE
// Edit this array to change routing behaviour.
// Rules are evaluated top-to-bottom; first match wins.
// The catch-all rule MUST always be last.
// ─────────────────────────────────────────────────────────────────────────────
export const ROUTING_RULES: RoutingRule[] = [
  {
    id:          "boise-plumbing-default",
    description: "All Boise Plumbing leads → Jobber + SMS",
    match:       { siteSlug: "boise-plumbing" },
    destination: "jobber_and_sms",
  },
  {
    id:          "catch-all",
    description: "All other leads → dashboard only",
    match:       {},
    destination: "dashboard_only",
  },
];

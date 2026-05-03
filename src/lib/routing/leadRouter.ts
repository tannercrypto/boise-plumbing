// src/lib/routing/leadRouter.ts
// Evaluates routing rules against a lead context.
// Returns a RoutingDecision used by POST /api/leads to orchestrate
// Jobber sync, SMS queuing, and routeUsed recording.

import { ROUTING_RULES, type RoutingDestination, type RoutingRule } from "./routingRules";

export interface LeadRoutingContext {
  siteSlug:  string;
  urgency:   string;
  service:   string;
  clientId?: string;
}

export interface RoutingDecision {
  destination: RoutingDestination;
  rule:        RoutingRule;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all routing rules against the lead context.
 * Always returns a decision — catch-all guarantees a match.
 */
export function resolveLeadDestination(
  context: LeadRoutingContext
): RoutingDecision {
  for (const rule of ROUTING_RULES) {
    if (matchesRule(rule, context)) {
      return { destination: rule.destination, rule };
    }
  }

  // Unreachable if ROUTING_RULES ends with a catch-all, but TS needs this.
  return {
    destination: "dashboard_only",
    rule: {
      id:          "implicit-fallback",
      description: "Implicit fallback",
      match:       {},
      destination: "dashboard_only",
    },
  };
}

function matchesRule(rule: RoutingRule, context: LeadRoutingContext): boolean {
  const { match } = rule;
  if (match.siteSlug && match.siteSlug !== context.siteSlug) return false;
  if (match.urgency  && match.urgency  !== context.urgency)  return false;
  if (match.service  && match.service  !== context.service)  return false;
  if (match.clientId && match.clientId !== context.clientId) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESTINATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Should this destination trigger a Jobber sync? */
export function shouldSyncToJobber(destination: RoutingDestination): boolean {
  return destination === "jobber_only" || destination === "jobber_and_sms";
}

/** Should this destination trigger SMS queuing? */
export function shouldSendSms(destination: RoutingDestination): boolean {
  return destination === "sms_only" || destination === "jobber_and_sms";
}

/** Human-readable label for admin UI. */
export function destinationLabel(destination: RoutingDestination): string {
  switch (destination) {
    case "jobber_only":    return "Jobber";
    case "dashboard_only": return "Dashboard only";
    case "sms_only":       return "SMS only";
    case "jobber_and_sms": return "Jobber + SMS";
  }
}

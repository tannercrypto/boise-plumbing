// src/lib/messaging/smsTemplates.ts
// Renders SMS message bodies from templates.
// Enforces opt-out language on ALL customer-facing messages.
//
// IMPORTANT: Opt-out language ("Reply STOP to opt out") is appended
// automatically to every customer-facing message. This is required by
// TCPA and carrier guidelines. Do not remove this behaviour.
//
// Internal/operator notifications (business owner's phone) do NOT
// require opt-out language — they are B2B administrative messages.

import type { TemplateContext } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

// Sent to the BUSINESS OWNER (internal notification — no opt-out needed)
export const DEFAULT_OPERATOR_TEMPLATE =
  "🔔 New lead from {{site}}:\n" +
  "{{name}} | {{phone}}\n" +
  "Service: {{service}} | {{urgency}}\n" +
  "Address: {{address}}";

// Sent to the CUSTOMER (requires opt-out language)
export const DEFAULT_CUSTOMER_TEMPLATE =
  "Hi {{name}}, thanks for contacting {{site}}! " +
  "We received your request for {{service}} and will call you shortly at {{phone}}.";

// Required opt-out suffix for all customer-facing SMS
const OPT_OUT_SUFFIX = "\n\nReply STOP to opt out of SMS messages.";

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render a template string with context variables.
 * Supports {{variable}} syntax.
 */
export function renderTemplate(
  templateBody: string,
  context: TemplateContext
): string {
  return templateBody
    .replace(/\{\{name\}\}/g,    context.name)
    .replace(/\{\{phone\}\}/g,   context.phone)
    .replace(/\{\{service\}\}/g, context.service)
    .replace(/\{\{urgency\}\}/g, context.urgency)
    .replace(/\{\{address\}\}/g, context.address)
    .replace(/\{\{site\}\}/g,    context.site);
}

/**
 * Build an operator notification message (internal — no opt-out).
 */
export function buildOperatorMessage(
  context: TemplateContext,
  customTemplate?: string
): string {
  const template = customTemplate ?? DEFAULT_OPERATOR_TEMPLATE;
  return renderTemplate(template, context);
}

/**
 * Build a customer-facing confirmation message.
 * ALWAYS appends opt-out language — do not bypass this.
 */
export function buildCustomerMessage(
  context: TemplateContext,
  customTemplate?: string
): string {
  const template = customTemplate ?? DEFAULT_CUSTOMER_TEMPLATE;
  const body     = renderTemplate(template, context);
  return body + OPT_OUT_SUFFIX;
}

/**
 * Validate a template body for required variable coverage.
 * Returns a list of warnings (empty = valid).
 */
export function validateTemplate(templateBody: string): string[] {
  const warnings: string[] = [];
  const used = templateBody.match(/\{\{(\w+)\}\}/g) ?? [];

  if (used.length === 0) {
    warnings.push("Template contains no variables — will send identical text to every recipient.");
  }

  // Check for variables that don't exist
  const VALID_VARS = ["name", "phone", "service", "urgency", "address", "site"];
  for (const v of used) {
    const varName = v.replace(/\{\{|\}\}/g, "");
    if (!VALID_VARS.includes(varName)) {
      warnings.push(`Unknown variable: ${v}. Valid variables: ${VALID_VARS.map((x) => `{{${x}}}`).join(", ")}`);
    }
  }

  return warnings;
}

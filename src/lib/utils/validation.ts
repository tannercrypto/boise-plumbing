// src/lib/utils/validation.ts

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTION (sent from client, validated server-side)
// ─────────────────────────────────────────────────────────────────────────────

export const attributionSchema = z.object({
  landingPageUrl: z.string().min(1).max(500),
  referrer:       z.string().max(500).optional(),
  utmSource:      z.string().max(200).optional(),
  utmMedium:      z.string().max(200).optional(),
  utmCampaign:    z.string().max(200).optional(),
  utmTerm:        z.string().max(200).optional(),
  utmContent:     z.string().max(200).optional(),
  gclid:          z.string().max(200).optional(),
  fbclid:         z.string().max(200).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// LEAD FORM
// ─────────────────────────────────────────────────────────────────────────────

export const leadFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  phone: z
    .string()
    .regex(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      "Please enter a valid phone number"
    ),

  email: z.string().email("Please enter a valid email address"),

  address: z
    .string()
    .min(5, "Please enter your full address")
    .max(200, "Address is too long"),

  service: z.string().min(1, "Please select a service"),

  urgency: z.enum(["EMERGENCY", "URGENT", "STANDARD", "FLEXIBLE"], {
    required_error: "Please select urgency level",
  }),

  notes: z.string().max(1000, "Notes are too long").optional(),
});

export type LeadFormSchema = z.infer<typeof leadFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FULL SUBMISSION PAYLOAD (client → API)
// ─────────────────────────────────────────────────────────────────────────────

export const leadSubmissionSchema = leadFormSchema.extend({
  siteSlug:    z.string().min(1).max(100),
  attribution: attributionSchema,
  // Honeypot — must be absent or empty string; any value = bot
  website:     z.string().max(0, "").optional(),
});

export type LeadSubmissionSchema = z.infer<typeof leadSubmissionSchema>;

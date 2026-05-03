// src/types/index.ts
// Central type definitions for the multi-site lead gen platform

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS (mirror Prisma enums — keep in sync)
// ─────────────────────────────────────────────────────────────────────────────

export type UrgencyLevel = "EMERGENCY" | "URGENT" | "STANDARD" | "FLEXIBLE";

export type LeadStatus =
  | "NEW"
  | "SUBMITTED_TO_JOBBER"
  | "JOBBER_ERROR"
  | "CONTACTED"
  | "BOOKED"
  | "LOST";

export type JobberSyncStatus = "PENDING" | "SUCCESS" | "ERROR" | "SKIPPED";
export type JobberApiStatus = "SUCCESS" | "ERROR" | "SKIPPED";

// ─────────────────────────────────────────────────────────────────────────────
// SITE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export interface SiteConfig {
  id: string;
  name: string;
  slug: string;
  domain: string;
  city: string;
  state: string;
  timezone: string;
  phoneNumber: string;
  sourceLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTION
// All tracking fields captured at form submission time.
// Populated by src/lib/tracking/capture.ts on the client side.
// ─────────────────────────────────────────────────────────────────────────────

export interface AttributionData {
  landingPageUrl: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD FORM
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  urgency: UrgencyLevel;
  notes?: string;
}

// Full payload sent from client → POST /api/leads
export interface LeadSubmissionPayload extends LeadFormData {
  siteSlug: string;         // identifies which Site record to attach to
  attribution: AttributionData;
}

// DB record shape (dates serialized to ISO strings for API responses)
export interface LeadRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  siteId: string;
  clientId: string | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  urgency: UrgencyLevel;
  notes: string | null;
  sourceLabel: string;
  landingPageUrl: string;
  referrer: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  fbclid: string | null;
  status: LeadStatus;
  jobberClientId: string | null;
  jobberRequestId: string | null;
  jobberSyncStatus: JobberSyncStatus;
  jobberSyncedAt: string | null;
  jobberError: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LeadSubmitResponse {
  leadId: string;
  jobberSyncStatus: JobberSyncStatus;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBBER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface JobberTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface JobberGraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export interface JobberSyncResult {
  status: JobberSyncStatus;
  clientId?: string;
  requestId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOBBER INPUT TYPES
// ⚠️  These are placeholder shapes. Verify all field names against Jobber
//     GraphiQL before use. See src/lib/jobber/jobberMutations.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface JobberClientInput {
  firstName: string;
  lastName: string;
  phones?: Array<{ number: string; primary?: boolean }>;
  emails?: Array<{ address: string; primary?: boolean }>;
  billingAddress?: JobberAddress;
  notes?: string;
}

export interface JobberRequestInput {
  clientId: string;
  title: string;
  instructions?: string;
  propertyAddress?: JobberAddress;
}

export interface JobberAddress {
  street1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_OPTIONS = [
  { value: "emergency", label: "Emergency Plumbing" },
  { value: "drain-cleaning", label: "Drain Cleaning" },
  { value: "water-heater", label: "Water Heater Repair / Replacement" },
  { value: "leak-repair", label: "Leak Repair" },
  { value: "pipe-repair", label: "Pipe Repair / Replacement" },
  { value: "toilet-repair", label: "Toilet Repair" },
  { value: "faucet-repair", label: "Faucet / Fixture Repair" },
  { value: "sewer-line", label: "Sewer Line Service" },
  { value: "other", label: "Other / Not Sure" },
] as const;

export const URGENCY_OPTIONS: Array<{
  value: UrgencyLevel;
  label: string;
  description: string;
}> = [
  {
    value: "EMERGENCY",
    label: "🚨 Emergency",
    description: "Active leak, flood, or no water — need help NOW",
  },
  {
    value: "URGENT",
    label: "⚡ Urgent",
    description: "Serious issue, need service within 24 hours",
  },
  {
    value: "STANDARD",
    label: "📅 Standard",
    description: "Within the next week works fine",
  },
  {
    value: "FLEXIBLE",
    label: "🗓️ Flexible",
    description: "No rush, schedule at your convenience",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — ANALYTICS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AlertType      = "CLICKS_DROP" | "LEADS_DROP" | "JOBBER_SYNC_FAILURES";
export type AlertSeverity  = "INFO" | "WARNING" | "CRITICAL";
export type RevenueSource  = "MANUAL" | "JOBBER";

// Google OAuth token response (shared by GSC + GA4)
export interface GoogleTokenResponse {
  access_token:  string;
  refresh_token?: string;
  expires_in:    number;
  token_type:    string;
  scope?:        string;
}

// GSC API row returned from Search Analytics query
export interface GscApiRow {
  keys:        string[];          // [page] or [query] or [page, query]
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;            // stored as gscAvgPosition — NOT exact rank
}

// Processed GSC record ready for DB upsert
export interface GscMetricRecord {
  date:           Date;
  page?:          string;
  query?:         string;
  clicks:         number;
  impressions:    number;
  ctr:            number;
  gscAvgPosition: number;
}

// GA4 traffic source breakdown item (stored as JSON in Ga4DailyMetric)
export interface TrafficSourceBreakdown {
  source:    string;
  medium:    string;
  campaign:  string;
  sessions:  number;
}

// Processed GA4 record ready for DB upsert
export interface Ga4MetricRecord {
  date:           Date;
  users:          number;
  newUsers:       number;
  sessions:       number;
  pageViews:      number;
  formSubmits:    number;
  callClicks:     number;
  trafficSources: TrafficSourceBreakdown[];
}

// Asset snapshot (computed daily)
export interface AssetSnapshotData {
  leads30d:            number;
  bookedJobs30d:       number;
  estimatedRevenue30d: number;
  confirmedRevenue30d: number;
  organicClicks30d:    number;
  impressions30d:      number;
  jobberSyncRate:      number;
}

// Keyword movement row (computed from GscDailyMetric)
export interface KeywordMovementRow {
  query:           string;
  positionToday:   number;
  position7d:      number | null;
  position30d:     number | null;
  movementVs7d:    number | null;   // negative = improved (lower position = better)
  clicks30d:       number;
  impressions30d:  number;
}

// Alert record for admin display
export interface AlertRecord {
  id:          string;
  createdAt:   string;
  siteId:      string;
  type:        AlertType;
  severity:    AlertSeverity;
  message:     string;
  metadata:    Record<string, unknown>;
  isRead:      boolean;
  resolvedAt:  string | null;
}

// Per-site analytics dashboard summary
export interface SiteAnalyticsSummary {
  siteId:          string;
  siteName:        string;
  // Lead funnel
  totalLeads:      number;
  leadsByPage:     Array<{ page: string; count: number }>;
  leadsByService:  Array<{ service: string; count: number }>;
  leadsBySource:   Array<{ source: string; count: number }>;
  jobberSuccessRate: number;
  // Search performance
  organicClicks30d: number;
  impressions30d:   number;
  avgCtr30d:        number;
  avgPosition30d:   number;
  clicksTrend:      Array<{ date: string; clicks: number }>;
  impressionsTrend: Array<{ date: string; impressions: number }>;
  ctrTrend:         Array<{ date: string; ctr: number }>;
  // Revenue
  estimatedRevenue30d: number;
  confirmedRevenue30d: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — REVENUE, VALUATION, CALL TRACKING, REPORTING
// ─────────────────────────────────────────────────────────────────────────────

export type CallLeadStatus = "RECEIVED" | "ANSWERED" | "VOICEMAIL" | "MISSED" | "SPAM";

// Revenue edit payload (PATCH /api/admin/leads/:id/revenue)
export interface RevenueUpdatePayload {
  estimatedJobValue?: number | null;
  confirmedJobValue?: number | null;
  revenueSource?:     RevenueSource | null;
  commissionAmount?:  number | null;
}

// Asset valuation output
export interface AssetValuation {
  monthlyProfit:     number;
  profitBasis:       "confirmed_commission" | "estimated_commission" | "estimated_lead_value";
  conservative:      number;   // × 18
  base:              number;   // × 24
  aggressive:        number;   // × 36
  disclaimer:        string;
}

// Portfolio stats (admin dashboard)
export interface PortfolioStats {
  totalSites:          number;
  totalLeads30d:       number;
  totalConfirmedRevenue30d: number;
  topSite:             { name: string; slug: string; leads30d: number } | null;
  sitesWithAlerts:     Array<{ name: string; slug: string; alertCount: number }>;
  jobberSyncHealth:    { successRate: number; totalAttempts: number };
}

// Client report data (safe — no internal fields)
export interface ClientReportData {
  siteName:          string;
  domain:            string;
  reportDate:        string;
  // Lead metrics
  totalLeads30d:     number;
  bookedJobs30d:     number;
  estimatedRevenue30d: number;
  confirmedRevenue30d: number;
  // Search performance
  organicClicks30d:  number;
  impressions30d:    number;
  avgPosition30d:    number;
  avgCtr30d:         number;
  positionTrend:     Array<{ date: string; position: number }>;
  // Top content
  topPages:          Array<{ page: string; clicks: number }>;
  topQueries:        Array<{ query: string; clicks: number; position: number }>;
}

// Call tracking settings (admin)
export interface CallTrackingSettings {
  trackingPhone?:        string;
  forwardingPhone?:      string;
  callTrackingProvider?: string;
  callTrackingEnabled:   boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — MESSAGING, CLIENT SETTINGS, CALL INGESTION
// ─────────────────────────────────────────────────────────────────────────────

export type MessageDeliveryMethod = "MAC_LOCAL" | "FUTURE_TWILIO" | "MANUAL";
export type MessageStatus         = "QUEUED" | "SENT" | "FAILED";

// Client routing + messaging settings
export interface ClientSettingsData {
  defaultRoute:             string;   // RoutingDestination
  messagingEnabled:         boolean;
  messageRecipientPhones:   string[];
  defaultMessageTemplateId: string | null;
}

// Message template
export interface MessageTemplateData {
  id:           string;
  name:         string;
  templateBody: string;
  isActive:     boolean;
  clientId:     string;
}

// Queued message (returned by GET /api/messages/queue to bridge)
export interface QueuedMessage {
  id:            string;
  recipientPhone: string;
  messageBody:   string;
  leadId:        string | null;
  siteId:        string | null;
  createdAt:     string;
}

// Inbound call payload (POST /api/calls/inbound)
export interface InboundCallPayload {
  trackingPhone:   string;   // used to look up the Site
  callerNumber:    string;
  durationSeconds?: number;
  sourcePage?:     string;
  utmSource?:      string;
  utmMedium?:      string;
  utmCampaign?:    string;
  status?:         CallLeadStatus;
}

// SMS template variable context (used by smsTemplates.ts)
export interface TemplateContext {
  name:     string;
  phone:    string;
  service:  string;
  urgency:  string;
  address:  string;
  site:     string;
}

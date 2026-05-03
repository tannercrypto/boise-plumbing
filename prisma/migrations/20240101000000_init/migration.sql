-- Migration: 20240101000000_init
-- Initial schema for Boise Plumbing Lead Generation Platform (Phases 1–6)
-- Run with: npx prisma migrate deploy

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "UrgencyLevel" AS ENUM ('EMERGENCY', 'URGENT', 'STANDARD', 'FLEXIBLE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'SUBMITTED_TO_JOBBER', 'JOBBER_ERROR', 'CONTACTED', 'BOOKED', 'LOST');
CREATE TYPE "JobberSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'SKIPPED');
CREATE TYPE "JobberApiStatus" AS ENUM ('SUCCESS', 'ERROR', 'SKIPPED');
CREATE TYPE "AlertType" AS ENUM ('CLICKS_DROP', 'LEADS_DROP', 'JOBBER_SYNC_FAILURES');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "RevenueSource" AS ENUM ('MANUAL', 'JOBBER');
CREATE TYPE "CallLeadStatus" AS ENUM ('RECEIVED', 'ANSWERED', 'VOICEMAIL', 'MISSED', 'SPAM');
CREATE TYPE "MessageDeliveryMethod" AS ENUM ('MAC_LOCAL', 'FUTURE_TWILIO', 'MANUAL');
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- ─────────────────────────────────────────────────────────────────────────────
-- SITE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Boise',
    "phoneNumber" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trackingPhone" TEXT,
    "forwardingPhone" TEXT,
    "callTrackingProvider" TEXT,
    "callTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
CREATE INDEX "Site_slug_idx" ON "Site"("slug");
CREATE INDEX "Site_domain_idx" ON "Site"("domain");

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "clientSlug" TEXT,
    "reportToken" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Client_clientSlug_key" ON "Client"("clientSlug");
CREATE INDEX "Client_phone_idx" ON "Client"("phone");
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "urgency" "UrgencyLevel" NOT NULL,
    "notes" TEXT,
    "sourceLabel" TEXT NOT NULL,
    "landingPageUrl" TEXT NOT NULL,
    "referrer" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "jobberClientId" TEXT,
    "jobberRequestId" TEXT,
    "jobberSyncStatus" "JobberSyncStatus" NOT NULL DEFAULT 'PENDING',
    "jobberSyncedAt" TIMESTAMP(3),
    "jobberError" TEXT,
    "routeUsed" TEXT,
    "estimatedJobValue" DOUBLE PRECISION,
    "confirmedJobValue" DOUBLE PRECISION,
    "revenueSource" "RevenueSource",
    "commissionAmount" DOUBLE PRECISION,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_siteId_idx" ON "Lead"("siteId");
CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_jobberSyncStatus_idx" ON "Lead"("jobberSyncStatus");
CREATE INDEX "Lead_utmSource_utmMedium_utmCampaign_idx" ON "Lead"("utmSource", "utmMedium", "utmCampaign");
CREATE INDEX "Lead_gclid_idx" ON "Lead"("gclid");
CREATE INDEX "Lead_fbclid_idx" ON "Lead"("fbclid");

-- ─────────────────────────────────────────────────────────────────────────────
-- JOBBER CONNECTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "JobberConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jobberAccountId" TEXT,
    "jobberAccountName" TEXT,

    CONSTRAINT "JobberConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobberConnection_siteId_isActive_idx" ON "JobberConnection"("siteId", "isActive");

-- ─────────────────────────────────────────────────────────────────────────────
-- JOBBER API LOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "JobberApiLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "operation" TEXT NOT NULL,
    "status" "JobberApiStatus" NOT NULL,
    "durationMs" INTEGER,
    "requestBody" TEXT,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "httpStatus" INTEGER,

    CONSTRAINT "JobberApiLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobberApiLog_leadId_idx" ON "JobberApiLog"("leadId");
CREATE INDEX "JobberApiLog_createdAt_idx" ON "JobberApiLog"("createdAt");
CREATE INDEX "JobberApiLog_status_idx" ON "JobberApiLog"("status");
CREATE INDEX "JobberApiLog_operation_idx" ON "JobberApiLog"("operation");

-- ─────────────────────────────────────────────────────────────────────────────
-- GSC PROPERTY + DAILY METRICS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "GscProperty" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "propertyUri" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dataStartDate" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "GscProperty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GscProperty_siteId_key" ON "GscProperty"("siteId");
CREATE INDEX "GscProperty_siteId_idx" ON "GscProperty"("siteId");

CREATE TABLE "GscDailyMetric" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT,
    "query" TEXT,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "gscAvgPosition" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GscDailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GscDailyMetric_propertyId_date_page_query_key" ON "GscDailyMetric"("propertyId", "date", "page", "query");
CREATE INDEX "GscDailyMetric_propertyId_date_idx" ON "GscDailyMetric"("propertyId", "date");
CREATE INDEX "GscDailyMetric_propertyId_query_date_idx" ON "GscDailyMetric"("propertyId", "query", "date");
CREATE INDEX "GscDailyMetric_date_idx" ON "GscDailyMetric"("date");

-- ─────────────────────────────────────────────────────────────────────────────
-- GA4 PROPERTY + DAILY METRICS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Ga4Property" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Ga4Property_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ga4Property_siteId_key" ON "Ga4Property"("siteId");
CREATE INDEX "Ga4Property_siteId_idx" ON "Ga4Property"("siteId");

CREATE TABLE "Ga4DailyMetric" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ga4PropertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "users" INTEGER NOT NULL,
    "newUsers" INTEGER NOT NULL,
    "sessions" INTEGER NOT NULL,
    "pageViews" INTEGER NOT NULL,
    "formSubmits" INTEGER NOT NULL DEFAULT 0,
    "callClicks" INTEGER NOT NULL DEFAULT 0,
    "trafficSources" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Ga4DailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ga4DailyMetric_ga4PropertyId_date_key" ON "Ga4DailyMetric"("ga4PropertyId", "date");
CREATE INDEX "Ga4DailyMetric_ga4PropertyId_date_idx" ON "Ga4DailyMetric"("ga4PropertyId", "date");
CREATE INDEX "Ga4DailyMetric_date_idx" ON "Ga4DailyMetric"("date");

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSET SNAPSHOT + ALERT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "AssetSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "leads30d" INTEGER NOT NULL,
    "bookedJobs30d" INTEGER NOT NULL,
    "estimatedRevenue30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confirmedRevenue30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "organicClicks30d" INTEGER NOT NULL DEFAULT 0,
    "impressions30d" INTEGER NOT NULL DEFAULT 0,
    "jobberSyncRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetSnapshot_siteId_date_key" ON "AssetSnapshot"("siteId", "date");
CREATE INDEX "AssetSnapshot_siteId_date_idx" ON "AssetSnapshot"("siteId", "date");

CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Alert_siteId_createdAt_idx" ON "Alert"("siteId", "createdAt");
CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- ─────────────────────────────────────────────────────────────────────────────
-- CALL LEAD
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "CallLead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "clientId" TEXT,
    "trackingPhone" TEXT NOT NULL,
    "callerNumber" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "recordingUrl" TEXT,
    "sourcePage" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "status" "CallLeadStatus" NOT NULL DEFAULT 'RECEIVED',

    CONSTRAINT "CallLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CallLead_siteId_idx" ON "CallLead"("siteId");
CREATE INDEX "CallLead_clientId_idx" ON "CallLead"("clientId");
CREATE INDEX "CallLead_createdAt_idx" ON "CallLead"("createdAt");
CREATE INDEX "CallLead_status_idx" ON "CallLead"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENT SETTINGS + MESSAGE TEMPLATE + MESSAGE LOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateBody" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageTemplate_clientId_idx" ON "MessageTemplate"("clientId");
CREATE INDEX "MessageTemplate_isActive_idx" ON "MessageTemplate"("isActive");

CREATE TABLE "ClientSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "defaultRoute" TEXT NOT NULL DEFAULT 'jobber_only',
    "messagingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messageRecipientPhones" JSONB NOT NULL DEFAULT '[]',
    "defaultMessageTemplateId" TEXT,

    CONSTRAINT "ClientSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientSettings_clientId_key" ON "ClientSettings"("clientId");
CREATE INDEX "ClientSettings_clientId_idx" ON "ClientSettings"("clientId");

CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "leadId" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "templateId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "deliveryMethod" "MessageDeliveryMethod" NOT NULL DEFAULT 'MAC_LOCAL',
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageLog_leadId_idx" ON "MessageLog"("leadId");
CREATE INDEX "MessageLog_status_idx" ON "MessageLog"("status");
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");
CREATE INDEX "MessageLog_deliveryMethod_status_idx" ON "MessageLog"("deliveryMethod", "status");

-- ─────────────────────────────────────────────────────────────────────────────
-- FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobberConnection" ADD CONSTRAINT "JobberConnection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobberApiLog" ADD CONSTRAINT "JobberApiLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GscProperty" ADD CONSTRAINT "GscProperty_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GscDailyMetric" ADD CONSTRAINT "GscDailyMetric_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "GscProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ga4Property" ADD CONSTRAINT "Ga4Property_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ga4DailyMetric" ADD CONSTRAINT "Ga4DailyMetric_ga4PropertyId_fkey" FOREIGN KEY ("ga4PropertyId") REFERENCES "Ga4Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetSnapshot" ADD CONSTRAINT "AssetSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallLead" ADD CONSTRAINT "CallLead_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CallLead" ADD CONSTRAINT "CallLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientSettings" ADD CONSTRAINT "ClientSettings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientSettings" ADD CONSTRAINT "ClientSettings_defaultMessageTemplateId_fkey" FOREIGN KEY ("defaultMessageTemplateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

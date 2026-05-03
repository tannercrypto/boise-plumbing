# Boise Plumbing — Complete Setup & Operations Guide
## Phases 1–6 · Production Reference

---

## Table of Contents

1. [Environment variables](#environment-variables)
2. [Local development setup](#local-development-setup)
3. [Production deployment](#production-deployment)
4. [Onboarding a new client](#onboarding-a-new-client)
5. [Launching a new site](#launching-a-new-site)
6. [Mac message bridge](#mac-message-bridge)
7. [Verifying everything works](#verifying-everything-works)
8. [Architecture reference](#architecture-reference)
9. [Launch blockers](#launch-blockers)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in every value.

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase Transaction Pooler recommended) |
| `ADMIN_SECRET_KEY` | ✅ | Admin login password + HMAC session secret. Min 16 chars. Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Full domain: `https://boiseplumbing.com` — used in sitemap, JSON-LD, canonicals |
| `JOBBER_CLIENT_ID` | ✅ (for Jobber) | From developer.getjobber.com → My Apps |
| `JOBBER_CLIENT_SECRET` | ✅ (for Jobber) | Same source |
| `JOBBER_REDIRECT_URI` | ✅ (for Jobber) | `https://yourdomain.com/api/jobber/callback` — must match Jobber portal exactly |
| `JOBBER_API_VERSION` | ✅ (for Jobber) | `2024-11-15` — check Jobber docs for current value |
| `GOOGLE_CLIENT_ID` | ✅ (for GSC/GA4) | From console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | ✅ (for GSC/GA4) | Same source |
| `GOOGLE_REDIRECT_URI_GSC` | ✅ (for GSC) | `https://yourdomain.com/api/admin/analytics/gsc/callback` |
| `GOOGLE_REDIRECT_URI_GA4` | ✅ (for GA4) | `https://yourdomain.com/api/admin/analytics/ga4/callback` |
| `CRON_SECRET` | ✅ (for cron) | Authenticates cron job requests. Generate: `openssl rand -hex 32` |
| `LOCAL_BRIDGE_API_KEY` | ✅ (for bridge) | Authenticates mac-message-bridge. Generate: `openssl rand -hex 32`. **Never expose to frontend.** |
| `REPORT_TOKEN_SECRET` | Optional | Separate secret for report tokens. Falls back to `ADMIN_SECRET_KEY` if not set. |

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (local or Supabase)
- `npm install` (includes `tsx`, `prisma`, all deps)

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — minimum required: DATABASE_URL + ADMIN_SECRET_KEY + NEXT_PUBLIC_SITE_URL

# 3. Generate Prisma client
npx prisma generate

# 4. Run all migrations
npx prisma migrate dev --name init

# 5. Seed the Boise Plumbing site record
npx prisma db seed

# 6. Start dev server
npm run dev
```

### Useful dev commands

```bash
npm run dev              # start Next.js dev server (localhost:3000)
npm run db:studio        # open Prisma Studio GUI (localhost:5555)
npm run db:migrate       # create + apply a migration
npm run test:lead        # submit a test lead and verify pipeline
npm run test:integrations # test all endpoints
```

### Admin login
Navigate to `http://localhost:3000/admin` — you'll be redirected to login.
Password = value of `ADMIN_SECRET_KEY`.

---

## Production Deployment

### Platform: Vercel (recommended)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial"
# Push to GitHub repo

# 2. Import at vercel.com → New Project → select repo

# 3. Set all environment variables in Vercel dashboard
#    Project → Settings → Environment Variables
#    Add every variable from the table above

# 4. Deploy

# 5. After first deploy, run migrations
DATABASE_URL="your-prod-url" npx prisma migrate deploy

# 6. Seed the site record
DATABASE_URL="your-prod-url" npx prisma db seed
```

### Database: Supabase (recommended)

1. Create project at supabase.com
2. Go to Settings → Database → Connection String → **Transaction Pooler** tab
3. Copy the connection string into `DATABASE_URL`
4. Use Transaction Pooler (port 6543) — not Direct (port 5432) — for serverless compatibility

### Vercel cron jobs

`vercel.json` is already configured. Cron jobs run automatically after deployment:

| Cron | Schedule | Purpose |
|---|---|---|
| `/api/cron/sync-analytics` | 06:00 UTC daily | Pull GSC + GA4 data |
| `/api/cron/compute-snapshots` | 07:00 UTC daily | Compute asset snapshots |
| `/api/cron/check-alerts` | 08:00 UTC daily | Evaluate alert thresholds |

To trigger manually (e.g. for backfill):
```bash
curl -X POST https://yourdomain.com/api/cron/sync-analytics \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## Onboarding a New Client

A "client" is the business owner who receives leads from the site.

### Step 1: Submit first lead
The client record is created automatically when the first form submission arrives from their address. The system deduplicates by phone number first, then email.

### Step 2: Configure settings
Go to **Admin → Clients → [client name] → Settings**:

- **Default route:** `jobber_and_sms` (or `jobber_only` if no bridge)
- **Messaging enabled:** toggle on if using the mac bridge
- **Recipient phones:** add the business owner's mobile number (digits only, e.g. `12085551234`)
- **Message template:** leave blank to use the default operator notification

### Step 3: Generate a report token (optional)
If the client wants access to `/reports/[clientSlug]`, you need to:

1. Set `clientSlug` in the Client record (e.g. `john-smith-plumbing`)
2. Generate a token using `generateReportToken(clientSlug)` from `src/lib/auth/reportToken.ts`
3. Store it in `Client.reportToken`
4. Send the token to the client — they enter it at `https://yourdomain.com/reports/[clientSlug]`

```bash
# Quick token generation in Node.js
node -e "
const { createHmac } = require('crypto');
const clientSlug = 'boise-plumbing-owner';
const secret = 'report:' + process.env.ADMIN_SECRET_KEY;
const payload = Buffer.from(JSON.stringify({ clientSlug, scope: 'report', iat: Math.floor(Date.now()/1000) })).toString('base64url');
const sig = createHmac('sha256', secret).update(payload).digest('base64url');
console.log(payload + '.' + sig);
"
```

---

## Launching a New Site

### Step 1: Add the site record
Via Prisma Studio (`npm run db:studio`) or by extending `prisma/seed.ts`:

```typescript
await prisma.site.create({
  data: {
    name:        "Meridian Plumbing",
    slug:        "meridian-plumbing",
    domain:      "meridianplumbing.com",
    city:        "Meridian",
    state:       "ID",
    timezone:    "America/Boise",
    phoneNumber: "(208) 555-0200",
    sourceLabel: "Meridian Plumbing SEO",
    isActive:    true,
  },
});
```

### Step 2: Deploy a new Next.js instance
The codebase is multi-site ready. Deploy with a different `NEXT_PUBLIC_SITE_URL` and a new `siteSlug` on all forms:

- Update `LeadForm` default `siteSlug` prop on the new site's pages
- Update metadata, JSON-LD, and phone number in the new site's page files
- Update `sitemap.ts` with the new domain

### Step 3: Complete the launch checklist
**Admin → Sites → [site name] → Launch checklist**

All required items must show ✅ before going live:
- ✅ Site created and active
- ✅ Test lead submitted
- ✅ Jobber connected
- ✅ Routing configured
- ✅ Search Console connected
- ✅ `NEXT_PUBLIC_SITE_URL` set

### Step 4: Connect Google Search Console

1. Admin → Sites → Connect Search Console
2. Authorize with the Google account that owns the GSC property
3. The property URI defaults to `sc-domain:[domain]` — verify this matches GSC exactly

### Step 5: Connect Jobber

1. Admin → Sites → Connect Jobber
2. Authorize with the Jobber account for this site
3. ⚠️ **Before going live**: verify the GraphQL mutations in `src/lib/jobber/jobberMutations.ts` using Jobber's GraphiQL (see Architecture Reference)

---

## Mac Message Bridge

The bridge runs on a Mac and sends operator SMS notifications via Messages.app when leads come in.

### Setup

```bash
# Set env vars (add to .zshrc or .bashrc for persistence)
export LOCAL_BRIDGE_API_KEY="your-key-from-env"
export BRIDGE_API_BASE="https://yourdomain.com"

# Or inline per run:
LOCAL_BRIDGE_API_KEY=xxx BRIDGE_API_BASE=https://yourdomain.com npm run bridge:messages
```

### Commands

```bash
# Continuous mode — runs until Ctrl+C (recommended for production use)
LOCAL_BRIDGE_API_KEY=xxx BRIDGE_API_BASE=https://yourdomain.com npm run bridge:messages

# Dry run — shows what would be sent, no actual SMS
LOCAL_BRIDGE_API_KEY=xxx BRIDGE_API_BASE=https://yourdomain.com npm run bridge:messages:dry

# Single poll, then exit — good for testing
LOCAL_BRIDGE_API_KEY=xxx BRIDGE_API_BASE=https://yourdomain.com npm run bridge:messages:once
```

### Requirements
- macOS with Messages.app signed in (iMessage or iPhone SMS relay via Handoff)
- Messages.app must be able to send to the recipient numbers
- Outbound HTTPS from the Mac to your deployed domain

### How it works
1. A lead submits the form → `POST /api/leads` queues a `MessageLog` row (status: `QUEUED`)
2. Bridge polls `GET /api/messages/queue` every 15 seconds
3. Bridge sends via AppleScript → Messages.app
4. Bridge calls `POST /api/messages/:id/mark-sent` or `mark-failed`

---

## Verifying Everything Works

### Quick verification (run after any deploy)

```bash
# Test lead submission + honeypot + rate limiter
BASE_URL=https://yourdomain.com npm run test:lead

# Test all integration endpoints
BASE_URL=https://yourdomain.com \
BRIDGE_KEY=your-bridge-key \
npm run test:integrations
```

### Manual checklist

**Lead pipeline:**
1. Submit a test lead via the public form on the homepage
2. Check Admin → Leads — it should appear with status `NEW`
3. If Jobber is connected: check Admin → Leads → lead detail — `Jobber Sync` should show `✓ Synced`
4. If bridge is running: check your phone — operator SMS should arrive within 30 seconds

**Admin access:**
1. Visit `https://yourdomain.com/admin` — should redirect to login
2. Log in with `ADMIN_SECRET_KEY` — should land on Dashboard
3. Visit `https://yourdomain.com/admin/leads` — should show leads list

**SEO:**
1. `https://yourdomain.com/sitemap.xml` — should return XML with 5 URLs
2. `https://yourdomain.com/robots.txt` — should disallow `/admin/` and `/api/`
3. View source on homepage — should contain `application/ld+json` script tag

**Security:**
1. `https://yourdomain.com/admin/leads` without session → redirects to `/admin/login` ✅
2. `https://yourdomain.com/api/messages/queue` without bridge key → 401 ✅
3. Submit form 6 times rapidly → 6th gets 429 ✅

### Jobber GraphQL verification (required before first lead)

The mutations in `src/lib/jobber/jobberMutations.ts` are **stubs** that must be verified:

1. Complete Jobber OAuth connection (Admin → Sites → Connect Jobber)
2. Retrieve access token from Prisma Studio → `JobberConnection.accessToken`
3. Open Insomnia or Postman → `POST https://api.getjobber.com/api/graphql`
4. Headers: `Authorization: Bearer <token>`, `X-JOBBER-GRAPHQL-VERSION: 2024-11-15`
5. Run introspection:
```graphql
{ __schema { mutationType { fields { name args { name type { name kind ofType { name } } } } } } }
```
6. Find `clientCreate` and `requestCreate` — update field names in `jobberMutations.ts`
7. Submit a test lead and verify it appears in Jobber as a new Request

---

## Architecture Reference

### Folder structure
```
src/
├── app/
│   ├── (public pages)          homepage, service pages, contact
│   ├── admin/                  protected admin UI (middleware guards)
│   ├── api/
│   │   ├── leads/              POST submit (public), GET list (admin)
│   │   ├── admin/              admin API routes (session auth)
│   │   ├── messages/           bridge endpoints (bridge key auth)
│   │   ├── calls/              call tracking ingest (bridge key auth)
│   │   ├── cron/               daily cron endpoints (cron secret auth)
│   │   ├── jobber/             Jobber OAuth callbacks
│   │   └── reports/            report token auth
│   └── reports/                client-facing read-only reports
│
├── lib/
│   ├── analytics/              GSC + GA4 API clients, sync, snapshots, alerts
│   ├── auth/                   session, adminAuth, reportToken
│   ├── db/                     Prisma service layers (one file per domain)
│   ├── jobber/                 Jobber OAuth, GraphQL client, sync orchestrator
│   ├── messaging/              message queue, bridge auth, SMS templates
│   ├── routing/                lead routing rules and decision engine
│   ├── security/               rate limiter, honeypot
│   ├── seo/                    JSON-LD helpers
│   ├── tracking/               UTM capture, event tracking
│   ├── utils/                  cn(), formatters, Zod validation schemas
│   └── valuation/              asset valuation calculator
│
└── components/
    ├── admin/                  AdminShell, LeadActions, RevenueEditor, etc.
    ├── forms/                  LeadForm (with honeypot + tracking)
    ├── layout/                 Header (click-to-call), Footer
    ├── reports/                ReportLoginForm
    ├── sections/               TrustBadges
    └── tracking/               AttributionInit
```

### Auth layers (fully isolated)

| Layer | Mechanism | Used by |
|---|---|---|
| Admin session | HMAC-signed cookie (8h) | `/admin/*` pages, admin API routes |
| Admin API key | `x-admin-key` header | Direct API access, cron fallback |
| Bridge key | `x-bridge-api-key` header | `/api/messages/*`, `/api/calls/inbound` |
| Report token | HMAC-signed token (1yr) | `/reports/*` pages |
| Cron secret | `x-cron-secret` header | `/api/cron/*` |
| Jobber OAuth | Per-site tokens in DB | Jobber API calls |
| Google OAuth | Per-site tokens in DB | GSC + GA4 API calls |

### Lead flow (full pipeline)

```
Public form submit
  → POST /api/leads
  → Rate limit check (5/min/IP)
  → Honeypot check (website field)
  → Zod validation
  → Resolve Site (by siteSlug)
  → Routing decision (routingRules.ts)
  → findOrCreateClient (dedup by phone → email)
  → createLead (full attribution snapshot)
  → [if route includes Jobber] syncLeadToJobber → JobberApiLog
  → [if route includes SMS] enqueueLeadMessages → MessageLog (QUEUED)
  → Return { leadId, jobberSyncStatus, message }

Bridge (runs on Mac, polls every 15s)
  → GET /api/messages/queue
  → Send via Messages.app
  → POST /api/messages/:id/mark-sent | mark-failed
```

### Database models

| Model | Purpose |
|---|---|
| `Site` | One row per website. Has call tracking fields, relations to all other models. |
| `Client` | Deduplicated contact. Has `clientSlug` + `reportToken` for client reports. |
| `Lead` | One row per form submission. Full attribution snapshot + Jobber sync state. |
| `JobberConnection` | Per-site OAuth tokens. Auto-refreshed before each API call. |
| `JobberApiLog` | Every Jobber API call logged. Sanitized — no tokens stored. |
| `GscProperty` | Per-site GSC OAuth + property URI. |
| `GscDailyMetric` | One row per (property, date, page/query). Upserted daily. |
| `Ga4Property` | Per-site GA4 OAuth + numeric property ID. |
| `Ga4DailyMetric` | Daily GA4 metrics + traffic source breakdown (JSON). |
| `AssetSnapshot` | Daily computed rollup: leads, revenue, clicks, sync rate. |
| `Alert` | One per alert type per site per day. Idempotent. |
| `ClientSettings` | Per-client routing + messaging config. |
| `MessageTemplate` | Reusable SMS templates with `{{variable}}` syntax. |
| `MessageLog` | Every queued/sent/failed message. Provider-neutral. |
| `CallLead` | Inbound call events from tracking providers. |

### Routing destinations

| Destination | Jobber | SMS | Use when |
|---|---|---|---|
| `jobber_only` | ✅ | ❌ | Standard — push to Jobber, no SMS |
| `dashboard_only` | ❌ | ❌ | Site not yet connected to Jobber |
| `sms_only` | ❌ | ✅ | Bridge-only sites without Jobber |
| `jobber_and_sms` | ✅ | ✅ | Full pipeline — default for Boise Plumbing |

Edit routing rules in `src/lib/routing/routingRules.ts`.

---

## Launch Blockers

Resolve all of these before pointing real traffic at the site:

1. **Phone number** — `(208) 555-0100` is a placeholder throughout. Update in: `Header.tsx`, `Footer.tsx`, `page.tsx`, all service pages, `prisma/seed.ts`, and `buildLocalBusinessJsonLd()` in `jsonLd.tsx`.

2. **Jobber mutations** — stubs in `src/lib/jobber/jobberMutations.ts` must be verified in Jobber GraphiQL before any lead syncs. See [Jobber GraphQL verification](#jobber-graphql-verification-required-before-first-lead) above.

3. **`NEXT_PUBLIC_SITE_URL`** — must be set to the live domain on Vercel. Without it: sitemap URLs are wrong, JSON-LD `url` fields are blank, and canonical tags fail.

4. **GSC property URI** — the OAuth callback assumes `sc-domain:[domain]`. If your GSC property is registered with `https://` prefix instead, update the `propertyUri` in `src/app/api/admin/analytics/gsc/callback/route.ts`.

5. **Rate limiter scope** — the in-process rate limiter works correctly on a single Vercel function instance. If you enable Vercel's Edge Network or run behind a multi-region load balancer, replace with `@upstash/ratelimit` backed by Upstash Redis.

6. **Admin password strength** — `ADMIN_SECRET_KEY` must be at least 16 characters. For production, use `openssl rand -hex 32` to generate a 64-character key.

7. **Test lead cleanup** — after running `npm run test:lead`, mark those leads as `LOST` or delete them from Prisma Studio so your metrics start clean.

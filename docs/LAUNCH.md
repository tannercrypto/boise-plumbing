# Boise Plumbing — Launch Runbook
## Step-by-step deployment: GitHub → Supabase → Vercel

**Estimated time:** 45–90 minutes (most of it is waiting for deploys)

---

## Pre-launch checklist (do these before anything else)

- [ ] Replace `(208) 555-0100` placeholder with the real business phone number in:
  - `src/components/layout/Header.tsx`
  - `src/components/layout/Footer.tsx`
  - `src/app/page.tsx`
  - `src/app/emergency-plumber-boise/page.tsx`
  - `src/app/drain-cleaning-boise/page.tsx`
  - `src/app/water-heater-repair-boise/page.tsx`
  - `src/app/contact/page.tsx`
  - `prisma/seed.ts`
  - `src/lib/seo/jsonLd.tsx` (in `buildLocalBusinessJsonLd`)
- [ ] Update business address in `src/lib/seo/jsonLd.tsx`
- [ ] Update `info@boiseplumbing.com` in `src/app/contact/page.tsx` to real email
- [ ] Have all environment variable values ready (see `.env.example`)

---

## Step 1: GitHub

### 1.1 Initialize repo and make first commit

```bash
cd /path/to/boise-plumbing

git init
git add .
git commit -m "feat: Boise Plumbing lead gen platform — Phases 1–6"
```

### 1.2 Verify no secrets are committed

```bash
# This must return nothing — no .env files should be tracked
git ls-files | grep -E "\.env$|\.env\.local|\.env\.production"

# Confirm .env.example contains only placeholder values
cat .env.example | grep -v "#" | grep -v "^$"
```

Expected: all values are placeholder strings like `generate_with_openssl_rand_hex_32`.

### 1.3 Push to GitHub

```bash
# Create a new repo at github.com (private), then:
git remote add origin https://github.com/YOUR_USERNAME/boise-plumbing.git
git branch -M main
git push -u origin main
```

---

## Step 2: Supabase

### 2.1 Create project

1. Go to **supabase.com** → New project
2. Project name: `boise-plumbing`
3. Choose a strong database password (save it — you'll need it for the connection string)
4. Region: `us-west-2` (closest to Boise, ID)
5. Wait ~2 minutes for the project to provision

### 2.2 Get the connection string

1. Supabase dashboard → **Project Settings** → **Database**
2. Click **Transaction Pooler** tab (not Direct)
3. Copy the connection string — it looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres
   ```
4. Add `?schema=public&pgbouncer=true` to the end:
   ```
   postgresql://postgres.xxxxxxxxxxxx:PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true
   ```

### 2.3 Run migrations

```bash
cd /path/to/boise-plumbing

# Set the production DATABASE_URL for this command only
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@host:6543/postgres?schema=public&pgbouncer=true" \
  npx prisma migrate deploy
```

Expected output:
```
Applying migration `20240101000000_init`
The following migration(s) have been applied:
  migrations/
    └─ 20240101000000_init/
         └─ migration.sql

All migrations have been applied.
```

If you see an error about `pgbouncer`, use the **Direct** connection string (port 5432) instead for the migration command only.

### 2.4 Seed initial data

```bash
DATABASE_URL="your-production-url" \
ADMIN_SECRET_KEY="your-admin-key" \
  npx prisma db seed
```

Expected output — note the report token — save it:
```
✓ Site:   Boise Plumbing (clxxxxx)
✓ Client: Boise Plumbing Owner (clxxxxx)
  Slug:   boise-plumbing-owner
  Token:  eyJjbGllbnRTbHVnIjoiYm9pc2...
✓ Template: Default Lead Alert (clxxxxx)
✓ ClientSettings: route=jobber_and_sms
```

### 2.5 Verify tables exist

Go to Supabase dashboard → **Table Editor**. You should see all tables:
`Site`, `Client`, `Lead`, `JobberConnection`, `JobberApiLog`, `GscProperty`, `GscDailyMetric`, `Ga4Property`, `Ga4DailyMetric`, `AssetSnapshot`, `Alert`, `CallLead`, `MessageTemplate`, `ClientSettings`, `MessageLog`

---

## Step 3: Vercel deployment

### 3.1 Create project

1. Go to **vercel.com** → Add New → Project
2. Import your GitHub repo (`boise-plumbing`)
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave blank (repo root)
5. **Do NOT deploy yet** — add env vars first

### 3.2 Add environment variables

In Vercel project → **Settings** → **Environment Variables**

Add every variable below. Set all three environments: Production, Preview, Development.

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Your Supabase Transaction Pooler URL | Include `?schema=public&pgbouncer=true` |
| `ADMIN_SECRET_KEY` | `openssl rand -hex 32` output | Min 64 chars recommended |
| `NEXT_PUBLIC_SITE_URL` | `https://boiseplumbing.com` | Your actual domain |
| `JOBBER_CLIENT_ID` | From Jobber developer portal | Leave as `placeholder` if not yet ready |
| `JOBBER_CLIENT_SECRET` | From Jobber developer portal | Leave as `placeholder` if not yet ready |
| `JOBBER_REDIRECT_URI` | `https://yourdomain.com/api/jobber/callback` | Must match Jobber portal exactly |
| `JOBBER_API_VERSION` | `2024-11-15` | Check Jobber docs for current version |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | Leave as `placeholder` if not yet ready |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Leave as `placeholder` if not yet ready |
| `GOOGLE_REDIRECT_URI_GSC` | `https://yourdomain.com/api/admin/analytics/gsc/callback` | |
| `GOOGLE_REDIRECT_URI_GA4` | `https://yourdomain.com/api/admin/analytics/ga4/callback` | |
| `CRON_SECRET` | `openssl rand -hex 32` output | Used to authenticate cron triggers |
| `LOCAL_BRIDGE_API_KEY` | `openssl rand -hex 32` output | Never expose publicly |

> **Note:** `SESSION_SECRET`, `ENCRYPTION_KEY`, and `NEXT_PUBLIC_TRACKING_PHONE` are NOT used by this codebase. Do not add them.

### 3.3 Deploy

1. Go to Vercel project → **Deployments** → click **Redeploy** or trigger from the Deployments tab
2. Watch the build log — it should complete in 60–120 seconds
3. Look for: `Build Completed` and `Ready`

If the build fails, check the log for:
- Missing env vars (any `undefined` in Next.js env errors)
- TypeScript errors (run `npx tsc --noEmit` locally first)
- Prisma client issues (the `postinstall` script runs `prisma generate` automatically if configured)

Add to `package.json` scripts if needed:
```json
"postinstall": "prisma generate"
```

### 3.4 Set custom domain (optional)

Vercel project → **Settings** → **Domains** → add `boiseplumbing.com`

Follow the DNS instructions Vercel provides (usually a CNAME record at your registrar).

---

## Step 4: Production smoke test

```bash
BASE_URL=https://boiseplumbing.com \
ADMIN_SECRET_KEY=your-admin-key \
BRIDGE_KEY=your-bridge-key \
CRON_SECRET=your-cron-secret \
npm run smoke-test
```

All required checks must pass before considering the launch complete.

If any check fails, see the [Troubleshooting](#troubleshooting) section below.

---

## Step 5: Jobber GraphQL verification

⚠️ **Do not send real leads to Jobber until this step is complete.**

The mutations in `src/lib/jobber/jobberMutations.ts` are stubs that must be verified.

### 5.1 Connect Jobber

1. Log in to admin: `https://yourdomain.com/admin`
2. Go to **Sites** → **Connect Jobber** for Boise Plumbing
3. Authorize with the Jobber account
4. Confirm "Jobber Connected" appears on the Sites page

### 5.2 Get access token

```bash
DATABASE_URL="your-prod-url" npx prisma studio
```

Navigate to `JobberConnection` table → copy `accessToken` value.

### 5.3 Run introspection

Use Insomnia, Postman, or curl:

```bash
curl -s -X POST https://api.getjobber.com/api/graphql \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-JOBBER-GRAPHQL-VERSION: 2024-11-15" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { mutationType { fields { name } } } }"}' \
  | python3 -m json.tool | grep '"name"' | head -20
```

Find `clientCreate` and `requestCreate` (or their current equivalents) in the output.

### 5.4 Update mutations file

Edit `src/lib/jobber/jobberMutations.ts` to match the verified field names.

### 5.5 Test a real sync

1. Submit a test lead via the form
2. In Admin → Leads → click the lead → check Jobber Sync status
3. Verify the request appears in your Jobber account under **Requests**

---

## Step 6: Cron verification

Test each cron endpoint manually:

```bash
# sync-analytics
curl -s -X POST https://boiseplumbing.com/api/cron/sync-analytics \
  -H "x-cron-secret: YOUR_CRON_SECRET" | python3 -m json.tool

# compute-snapshots
curl -s -X POST https://boiseplumbing.com/api/cron/compute-snapshots \
  -H "x-cron-secret: YOUR_CRON_SECRET" | python3 -m json.tool

# check-alerts
curl -s -X POST https://boiseplumbing.com/api/cron/check-alerts \
  -H "x-cron-secret: YOUR_CRON_SECRET" | python3 -m json.tool
```

Expected: `{ "success": true, ... }` for each. The first run will show `gscSynced: 0` and `ga4Synced: 0` until those integrations are connected — that's normal.

---

## Step 7: Mac bridge verification

```bash
# Export env vars
export LOCAL_BRIDGE_API_KEY="your-key"
export BRIDGE_API_BASE="https://boiseplumbing.com"

# 1. Dry run — verify queue endpoint works, no messages sent
npm run bridge:messages:dry

# 2. Single poll — verify end-to-end (needs a queued message first)
#    Submit a test lead via the form, then:
npm run bridge:messages:once

# 3. Continuous mode (for production use)
npm run bridge:messages
```

Expected dry-run output:
```
[timestamp] Starting mac-message-bridge (DRY RUN)
[timestamp] Queue empty.   ← or: Processing N message(s)...
[timestamp] [DRY RUN] Would send — skipping.
```

---

## Step 8: Client report access

Test the report page with the token from seed output:

```
https://boiseplumbing.com/reports/boise-plumbing-owner
```

You should see a login form. Enter the token from the seed output. The report should load showing the seeded client's data.

---

## Troubleshooting

### Build fails: "Cannot find module '@prisma/client'"
Add to `package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

### Migration fails: "pgbouncer mode"
Use the **Direct** connection string (port 5432, not 6543) for migrations only:
```
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres"
npx prisma migrate deploy
```
Use the Transaction Pooler URL for everything else.

### Seed fails: "P2002 Unique constraint"
The seed is idempotent — run it again. If it still fails, check if a record with `clientSlug="boise-plumbing-owner"` already exists in the Client table.

### Admin login fails
1. Verify `ADMIN_SECRET_KEY` is set in Vercel (not empty, min 16 chars)
2. Try a fresh browser window (no existing session cookie)
3. Check Vercel deployment logs for env var errors

### Lead submission returns 404
Verify the Boise Plumbing site record exists: `SELECT * FROM "Site" WHERE slug = 'boise-plumbing';`
If missing, re-run `npx prisma db seed`.

### Jobber sync status shows ERROR
This is expected until `jobberMutations.ts` is verified. Check the `JobberApiLog` table for the specific GraphQL error message.

---

## Launch report template

Fill this in after completing all steps:

```
LAUNCH REPORT — Boise Plumbing
Date: ___________

GitHub:
  Repo URL:          ___________
  Last commit:       ___________
  Secrets committed: NO ✓

Supabase:
  Project URL:       ___________
  Migration status:  Applied ✓
  Tables created:    16/16 ✓
  Seed data:
    Site ID:         ___________
    Client ID:       ___________
    Report token:    ___________

Vercel:
  Production URL:    ___________
  Build status:      ✓
  Custom domain:     ___________

Smoke test:
  Required checks:   ___/___
  Failed:            ___
  Notes:             ___________

Jobber:
  Connected:         YES / NO
  Mutations verified: YES / NO / PENDING
  Test lead synced:   YES / NO / PENDING

Launch blockers remaining:
  [ ] Phone number updated to real number
  [ ] Jobber mutations verified in GraphiQL
  [ ] Test leads marked as LOST

Next steps:
  1. ___________
  2. ___________
  3. ___________
```

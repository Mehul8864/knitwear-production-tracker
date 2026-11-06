# StitchOps — Deployment Guide

**GitHub Repository:** https://github.com/Mehul8864/knitwear-production-tracker
**Live Application:** https://stitchops-mehul8864.vercel.app

---

## Project Overview

StitchOps is a production order-tracking SaaS for knitwear exporters built with Next.js 16, Supabase, and TypeScript. It connects merchandisers, factory supervisors, and international buyers through a single source of production truth.

---

## Prerequisites

- Node.js 20+ (developed on v22.12.0)
- npm 10+ (v11 used in development)
- A Supabase project (kxhwpjsdqdxuvpisefmj — already migrated)
- An OpenAI account (optional — only needed for AI features)
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/Mehul8864/knitwear-production-tracker.git
cd knitwear-production-tracker
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Supabase Project Setup

The existing Supabase project reference is: **kxhwpjsdqdxuvpisefmj**

From the Supabase Dashboard (https://supabase.com/dashboard/project/kxhwpjsdqdxuvpisefmj):

1. Go to **Settings → API** — note your **Project URL** and **publishable key**
2. The **secret key** is required only for the seed script (server-side only — never expose to browser)
3. In **Storage** — the `production-photos` bucket must exist and be set to **PRIVATE**

---

## 4. Database Migration (Already Applied)

The three migrations have already been applied to the live Supabase project:

```
supabase/migrations/001_initial_schema.sql  ✅ Applied
supabase/migrations/002_rls_policies.sql    ✅ Applied
supabase/migrations/003_private_storage.sql ✅ Applied
```

To apply to a **fresh Supabase project**, run in the SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_private_storage.sql
supabase/seed.sql
```

Or use the Supabase CLI (once linked):

```bash
npx supabase db push --remote --yes
```

---

## 5. Environment Variables

### Required variable NAMES — never commit actual values

Copy the template:

```bash
cp .env.example .env.local
```

| Variable | Browser-safe? | Required | Where to find |
|----------|--------------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Public | Yes | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Public | Yes | Supabase → Settings → API → publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Public | Legacy fallback | Same as publishable key |
| `SUPABASE_SECRET_KEY` | 🔒 Server-only | Seed script only | Supabase → Settings → API → secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Server-only | Legacy fallback | Same as secret key |
| `OPENAI_API_KEY` | 🔒 Server-only | Optional | platform.openai.com → API keys |
| `OPENAI_MODEL` | ✅ Public | No (default: gpt-4o-mini) | Your choice |
| `WHISPER_MODEL` | ✅ Public | No (default: whisper-1) | Your choice |
| `NEXT_PUBLIC_APP_URL` | ✅ Public | Yes | Your deployment URL |

### Security instructions

- **Never commit `.env.local`** — it is gitignored
- **Never expose `SUPABASE_SECRET_KEY`** in any frontend component, client-side hook, or browser bundle
- **Never commit API keys, tokens, or passwords** to the repository
- The `NEXT_PUBLIC_*` variables are intentionally exposed to the browser — do not put secrets in them

### Local .env.local template (values are PLACEHOLDERS — do not copy these)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-supabase-dashboard>
SUPABASE_SECRET_KEY=<secret-key-server-side-only-never-in-browser>
OPENAI_API_KEY=<optional-openai-key>
OPENAI_MODEL=gpt-4o-mini
WHISPER_MODEL=whisper-1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. Seed Demo Data

Demo users and sample orders are already seeded in the live database. For a **fresh project**:

```bash
npm run seed
```

This script:
- Creates 5 demo users via Supabase Auth Admin API (server-side only)
- Inserts buyers, production units, TNA template, 3 sample orders
- Generates 18 production updates (6 working days × 3 orders)
- Generates buyer access tokens and prints the portal links to the console

⚠️ Do not run the seed script against the production database if it already has live data — the script uses `upsert` and `ignoreDuplicates` but will add new buyer tokens on each run.

---

## 7. Local Development

```bash
npm run dev
```

Open http://localhost:3000

---

## 8. Run Tests

```bash
npm test
```

Runs 84 unit tests covering: run-rate engine, utility functions, AI schema validation, photo access authorization (buyer isolation), and dashboard aggregation with PGRST201 regression.

---

## 9. Production Build

```bash
npm run build
npm run start
```

---

## 10. Deploy to Vercel (Production)

### Step-by-step

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select: `Mehul8864/knitwear-production-tracker`
4. Framework preset: **Next.js** (auto-detected)
5. Root directory: `./` (leave default)
6. Build command: `npm run build` (auto-detected)
7. Output directory: `.next` (auto-detected)

### Environment Variables in Vercel

In Vercel **Settings → Environment Variables**, add each variable for the **Production** environment:

| Variable name | Example value (do NOT use this — get from your Supabase dashboard) |
|---------------|---------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://kxhwpjsdqdxuvpisefmj.supabase.co |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(get from Supabase → Settings → API)* |
| `OPENAI_API_KEY` | *(get from platform.openai.com — optional)* |
| `OPENAI_MODEL` | gpt-4o-mini |
| `WHISPER_MODEL` | whisper-1 |
| `NEXT_PUBLIC_APP_URL` | https://stitchops-mehul8864.vercel.app |

**Do NOT add `SUPABASE_SECRET_KEY` to Vercel** — it is only needed locally for the seed script.

---

## 11. Supabase Auth URL Configuration

After deploying to Vercel, add your production URL to Supabase's allowed redirect list:

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   https://stitchops-mehul8864.vercel.app/**
   ```
3. Under **Site URL**, set:
   ```
   https://stitchops-mehul8864.vercel.app
   ```

This allows Supabase Auth email confirmations and session redirects to work on the production domain.

---

## 12. Supabase Storage Configuration

The `production-photos` bucket is already configured as **PRIVATE** via migration 003.

After any fresh migration:

1. Go to Storage → Buckets → `production-photos`
2. Confirm bucket **is not public**
3. Storage RLS policies are created by `003_private_storage.sql`:
   - Merchandisers and supervisors can INSERT
   - Merchandisers can SELECT all photos
   - Supervisors can SELECT photos for their unit's orders only
   - Buyers have **no direct storage access** — signed URLs are generated server-side

### Signed URL Security

```
Authenticated user → POST /api/photos/signed-url
  → validates session + role + order ownership
  → returns 60-second signed URL

Buyer (token link) → POST /api/photos/buyer-signed-url
  → validates token hash + expiry + revocation + order ownership
  → returns 60-second signed URL
```

No public URLs are ever generated.

---

## 13. Buyer Access Links (Post-Deployment)

The buyer access tokens seeded during local development point to `http://localhost:3000`.

After Vercel deployment, regenerate production buyer tokens:

1. Log in as `merchandiser@stitchops.demo`
2. Go to **Dashboard → Settings → Buyer Access Links**
3. Click **Generate Link** for each buyer
4. The new links will use `NEXT_PUBLIC_APP_URL` (your Vercel domain)

Share the generated links with buyers — they do not require login credentials.

---

## 14. AI Configuration

AI features are optional. Without `OPENAI_API_KEY`:
- Tamil notes can be manually categorised (all 9 categories available)
- Voice recording works but transcription is skipped
- The Settings page shows "AI not configured" clearly

---

## Demo Login Credentials

All passwords: `Demo@2026!`

| Role | Email |
|------|-------|
| Merchandiser | merchandiser@stitchops.demo |
| Supervisor (Unit Alpha) | supervisor@stitchops.demo |
| Supervisor (Unit Beta) | supervisor2@stitchops.demo |
| Buyer — Company B (UK) | buyer-b@stitchops.demo |
| Buyer — Company C (Germany) | buyer-c@stitchops.demo |

---

## Troubleshooting

### Login fails with demo credentials
Run `npm run seed` to create users in Supabase Auth (requires `SUPABASE_SECRET_KEY` set locally).

### Dashboard shows 0 production updates
Cause: PostgREST PGRST201 ambiguous FK join. This is already fixed in the codebase by using explicit FK hints in all `production_updates` queries. If it recurs, check that the query uses `supervisor:profiles!production_updates_supervisor_id_fkey(full_name)`.

### "Supabase URL is required"
`NEXT_PUBLIC_SUPABASE_URL` is missing from `.env.local` or Vercel env vars.

### Build fails with TypeScript error
Run `npm run type-check` to identify. All known type errors are resolved.

### AI classification shows "AI not configured"
Set `OPENAI_API_KEY` in your environment. The app works fully in manual mode without it.

### Storage upload fails
Confirm the `production-photos` bucket exists and migration 003 has been applied. Check Supabase → Storage → Policies.

### Photos not displaying (403 errors)
Signed URLs expire after 60 seconds and require an active session (authenticated users) or valid buyer token (buyer portal). Check browser console for PGRST errors or expired token messages.

### Buyer portal returns 404
The buyer token may be invalid, expired, or revoked. Generate a new token from Settings → Buyer Access Links.

### RLS blocking queries
Ensure migrations 001, 002, 003 are all applied. Run `npx supabase migration list --remote` to verify. Check Supabase → Logs → PostgREST for detailed RLS errors.

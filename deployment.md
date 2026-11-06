# StitchOps — Deployment Guide

**GitHub Repository:** https://github.com/Mehul8864/knitwear-production-tracker
**Live Application:** https://stitchops-mehul8864.vercel.app

---

## Project Overview

StitchOps is a premium production order-tracking SaaS for knitwear exporters. Built with Next.js 16 (App Router, Cache Components), Supabase PostgreSQL + Auth + Storage, and TypeScript. Connects merchandisers, factory supervisors, and international buyers through a single source of production truth.

---

## Prerequisites

- Node.js 22.x (project was developed on v22.12.0)
- npm 11.x
- A Supabase project (kxhwpjsdqdxuvpisefmj — already migrated)
- OpenAI account (optional — only for AI Tamil features)
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

The existing Supabase project: **kxhwpjsdqdxuvpisefmj** (stitchops-production)

From the Supabase Dashboard (https://supabase.com/dashboard/project/kxhwpjsdqdxuvpisefmj):

1. Go to **Settings → API** — note your Project URL and publishable key
2. The secret key is required only for the seed script (server-side only)
3. In **Storage** — the `production-photos` bucket must exist as **PRIVATE**

---

## 4. Database Migrations (Already Applied)

Three migrations have been applied to the live Supabase project:

```
001_initial_schema.sql  — 15 tables, indexes, triggers   ✅ Applied
002_rls_policies.sql    — RLS on all tables               ✅ Applied
003_private_storage.sql — Private bucket + storage RLS    ✅ Applied
```

To apply to a **fresh Supabase project**, open the SQL Editor and run in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_private_storage.sql
supabase/seed.sql
```

Or using the Supabase CLI (once linked):

```bash
npx supabase db push --remote --yes
```

---

## 5. Environment Variables

### Variable names — never commit actual values

Copy the template:

```bash
cp .env.example .env.local
```

| Variable | Browser-safe | Required | Where to find |
|----------|-------------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase → Settings → API → publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Fallback | Same as publishable key |
| `SUPABASE_SECRET_KEY` | No — server only | Seed script only | Supabase → Settings → API → secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | No — server only | Fallback | Same as secret key |
| `OPENAI_API_KEY` | No — server only | Optional | platform.openai.com |
| `OPENAI_MODEL` | Yes | No (default: gpt-4o-mini) | Your choice |
| `WHISPER_MODEL` | Yes | No (default: whisper-1) | Your choice |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Your deployment URL |

### Security rules

- **Never commit `.env.local`** — it is gitignored
- `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` must never appear in browser bundles or be used in client components
- `NEXT_PUBLIC_*` variables are intentionally browser-exposed — do not store secrets in them

---

## 6. Seed Demo Data

Demo users and sample orders are already seeded in the live Supabase database. For a **fresh project**:

```bash
npm run seed
```

The script creates 5 demo users, 3 sample orders, TNA milestones, 18 production updates, and buyer access tokens.

Do not run the seed against the live database if it already has real data.

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

Runs 84 unit tests: run-rate engine, utility functions, AI schema, photo isolation (buyer data isolation), and dashboard aggregation (PGRST201 regression).

---

## 9. Production Build

```bash
npm run build
npm run start
```

All 13 server-rendered pages use `await connection()` from `next/server` BEFORE `createClient()`, preventing Supabase transport initialization during Next.js Cache Components prerender. Each page also exports `export const instant = false` to mark it as a blocking route.

---

## 10. Deploy to Vercel

### Step-by-step

1. Go to https://vercel.com/new
2. Import repository: `Mehul8864/knitwear-production-tracker`
3. Framework: **Next.js** (auto-detected)
4. Root directory: `./`
5. Build command: `npm run build` (auto-detected)

### Vercel Environment Variables

Add these in **Settings → Environment Variables** for the Production environment:

| Variable | Example format (do NOT copy — get from your Supabase dashboard) |
|----------|------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://kxhwpjsdqdxuvpisefmj.supabase.co |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(get from Supabase → Settings → API)* |
| `OPENAI_API_KEY` | *(get from platform.openai.com — optional)* |
| `OPENAI_MODEL` | gpt-4o-mini |
| `WHISPER_MODEL` | whisper-1 |
| `NEXT_PUBLIC_APP_URL` | https://stitchops-mehul8864.vercel.app |

Do NOT add `SUPABASE_SECRET_KEY` to Vercel — it is only needed for the local seed script.

---

## 11. Supabase Auth URL Configuration

After deploying to Vercel, add your production domain to Supabase Auth:

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   https://stitchops-mehul8864.vercel.app/**
   ```
3. Under **Site URL**, set:
   ```
   https://stitchops-mehul8864.vercel.app
   ```

---

## 12. Supabase Storage Configuration

The `production-photos` bucket is already configured as **PRIVATE** via migration 003.

Key details:
- Merchandisers and supervisors can INSERT photos
- Merchandisers can SELECT all photos directly
- Supervisors can SELECT photos only for their production unit's orders
- Buyers have **no direct storage access** — they receive 60-second signed URLs generated server-side after token + order ownership validation

Signed URL flow:
```
Authenticated user → POST /api/photos/signed-url
  → validates session + role + order ownership
  → returns 60-second signed URL (never a public URL)

Buyer (token link) → POST /api/photos/buyer-signed-url
  → validates token hash + expiry + order ownership
  → returns 60-second signed URL
```

---

## 13. Buyer Access Links (Post-Deployment)

The seeded buyer tokens were generated with `http://localhost:3000`. After Vercel deployment, regenerate production tokens:

1. Log in as `merchandiser@stitchops.demo`
2. Go to **Dashboard → Settings → Buyer Access Links**
3. Click **Generate Link** for each buyer
4. Share the new links — they use `NEXT_PUBLIC_APP_URL` (your Vercel domain)

---

## 14. AI Configuration

Without `OPENAI_API_KEY`:
- Tamil notes can still be manually categorised (all 9 categories available)
- Voice recording still works — transcription is skipped
- Settings page displays "AI not configured" clearly

---

## Demo Login Credentials

Password for all accounts: `Demo@2026!`

| Role | Email |
|------|-------|
| Merchandiser | merchandiser@stitchops.demo |
| Supervisor (Unit Alpha) | supervisor@stitchops.demo |
| Supervisor (Unit Beta) | supervisor2@stitchops.demo |
| Buyer — Company B (UK) | buyer-b@stitchops.demo |
| Buyer — Company C (Germany) | buyer-c@stitchops.demo |

---

## Troubleshooting

### Dashboard shows 0 production updates

This is caused by PostgREST PGRST201 (ambiguous FK join). The fix is already applied — all queries use `supervisor:profiles!production_updates_supervisor_id_fkey(full_name)`. If this recurs, check that the FK hint is present.

### Vercel build: "Math.random() while prerendering" or "fetch() rejects"

This means a server page is calling `createClient()` before `await connection()`. All 13 pages must call `await connection()` BEFORE `createClient()`. The fix is applied in all current pages.

### Vercel build: "Event handlers cannot be passed to Client Component props"

A Server Component is passing an `onClick`/`onMouseEnter` function to a child component across the boundary. Fix by either adding `'use client'` to the component or replacing JS event handlers with CSS hover classes.

### Login fails with demo credentials

Run `npm run seed` (requires `SUPABASE_SECRET_KEY` set locally) to create users in Supabase Auth.

### Photos not displaying (403 errors)

Signed URLs expire after 60 seconds. They require an active session (authenticated users) or valid buyer token. Check browser console for expired token messages.

### Buyer portal returns 404

The buyer token may be invalid, expired, or revoked. Generate a new token from Settings → Buyer Access Links.

### RLS blocking queries

Ensure all three migrations are applied. Run `npx supabase migration list --remote` to verify.

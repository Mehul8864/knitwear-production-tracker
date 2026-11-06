# StitchOps

**Production visibility. Without the chasing.**

StitchOps is a premium, enterprise-grade production order-tracking SaaS built for knitwear export companies in Tiruppur, India. It connects merchandisers, factory supervisors, and international buyers through a single, real-time source of production truth.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-stitchops--mehul8864.vercel.app-0f1e35?style=flat&logo=vercel)](https://stitchops-mehul8864.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat&logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-84%20passing-22c55e?style=flat)](./src/lib)

---

## What is StitchOps?

Most knitwear exporters track production through WhatsApp groups, scattered Excel files, and phone calls. When a supervisor falls behind on stitching output, the merchandiser finds out too late — after the shipment is missed.

StitchOps replaces that chaos with a structured, role-based production tracking platform:

- Merchandisers see a live production command center with run-rate analysis and risk warnings
- Supervisors submit daily updates from the factory floor — even without internet
- International buyers access a secure, read-only portal scoped to their own orders

---

## Live Application

**Production URL:** https://stitchops-mehul8864.vercel.app

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Merchandiser | `merchandiser@stitchops.demo` | `Demo@2026!` |
| Supervisor | `supervisor@stitchops.demo` | `Demo@2026!` |
| Supervisor (Unit B) | `supervisor2@stitchops.demo` | `Demo@2026!` |
| Buyer — Company B (UK) | `buyer-b@stitchops.demo` | `Demo@2026!` |
| Buyer — Company C (Germany) | `buyer-c@stitchops.demo` | `Demo@2026!` |

---

## Features

### Production Dashboard
- KPI cards: active orders, on-track, at-risk, delayed, total pieces, shipping soon
- 7-day production trend bar chart with real factory data
- Early warning panel — flags orders at risk with deadline ≤ 14 days
- Recent factory updates with Tamil issue notes and AI classification

### Order Management
- Create orders with colour/size quantity matrix
- Filterable and sortable order board with GREEN/AMBER/RED risk status
- Run-rate engine: calculates required daily output, actual output, projected completion
- Full order detail with TNA milestone timeline and date-change audit trail

### TNA (Time and Action) Calendar
- Generate milestone dates from ex-factory date using configurable templates
- 9-stage workflow: Fabric In-house → Cutting → Stitching → Printing → Washing → Finishing → Packing → Final Inspection → Dispatch
- Every date change is permanently recorded with reason, author, and timestamp

### Supervisor Mobile Experience
- Mobile-first update form with 48px quantity input for factory floor use
- Tamil / English language toggle with AI-powered translation
- Voice note recording → Whisper transcription → GPT-4o-mini classification
- Photo capture and upload to private Supabase Storage
- **Offline-first**: updates queue in IndexedDB (Dexie) and sync automatically when connectivity returns

### AI Issue Classification
- 9 categories: MATERIAL_SHORTAGE, MACHINE_BREAKDOWN, LABOUR_SHORTAGE, QUALITY_REWORK, PRINTING_DELAY, WASHING_DELAY, POWER_OUTAGE, SUBCONTRACTOR_DELAY, OTHER
- Low-confidence results flagged for merchandiser review
- Human corrections recorded alongside original AI output
- Graceful fallback to manual selection when API key is absent

### Buyer Read-Only Portal
- Secure token-based access — no login credentials required
- SHA-256 hashed tokens with expiry and revocation
- Buyers see only their own orders — Company B cannot access Company C data
- Production photos served via 60-second signed URLs after token + order ownership validation

### Reports
- PDF export with colour-coded status cells (jsPDF + jspdf-autotable)
- Excel export (SheetJS/XLSX) with formatted columns
- Filterable by buyer

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4.5 (App Router, Cache Components) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + 80+ CSS custom property design tokens |
| UI Components | Radix UI primitives + custom design system |
| Icons | Lucide React |
| Charts | Custom CSS bar chart (production trend) |
| Forms | React Hook Form + Zod |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT sessions) |
| Storage | Supabase Storage (private bucket, signed URLs) |
| AI | OpenAI GPT-4o-mini (classification) + Whisper (transcription) |
| Offline | Dexie (IndexedDB) |
| Testing | Vitest + Testing Library |
| Deployment | Vercel (CI/CD from master) |

---

## Architecture

```
Browser
├── Server Components  — data fetching, rendering
├── Client Components  — forms, charts, offline queue
└── IndexedDB/Dexie    — offline supervisor updates

Next.js on Vercel
├── src/proxy.ts       — session refresh middleware
├── Server Components  — Supabase server client + RLS
└── Route Handlers     — /api/* (mutations, AI, signed URLs)

Supabase
├── PostgreSQL         — 15 tables with RLS on all
├── Auth               — JWT sessions, role in profiles table
└── Storage            — private production-photos bucket
```

---

## Database Schema

15 tables with Row Level Security on all:

`profiles` · `buyers` · `production_units` · `orders` · `order_items` · `tna_templates` · `tna_template_milestones` · `order_milestones` · `milestone_date_change_history` · `production_updates` · `ai_classifications` · `buyer_access_tokens` · `notifications` · `activity_logs`

Key design decisions:
- UUID primary keys everywhere using `gen_random_uuid()` (PostgreSQL 15 built-in)
- `production_updates.client_id` has a UNIQUE constraint for idempotent offline sync
- `buyer_access_tokens` stores only SHA-256 hashes — plain tokens are returned once and never persisted
- `milestone_date_change_history` is append-only — no updates or deletes permitted

---

## Getting Started Locally

### Prerequisites

- Node.js 22.x
- A [Supabase](https://supabase.com) project
- OpenAI API key (optional)

### Setup

```bash
# 1. Clone
git clone https://github.com/Mehul8864/knitwear-production-tracker.git
cd knitwear-production-tracker

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL and publishable key

# 4. Apply database migrations
# Open Supabase SQL Editor and run in order:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_rls_policies.sql
# supabase/migrations/003_private_storage.sql

# 5. Seed demo data (requires SUPABASE_SECRET_KEY in .env.local)
npm run seed

# 6. Start dev server
npm run dev
```

Open http://localhost:3000

### Environment Variables

See `.env.example` for all variable names. Never commit `.env.local`.

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL from Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable (anon) key — safe for browser |
| `SUPABASE_SECRET_KEY` | Seed only | Secret key — server-side only, never in browser |
| `OPENAI_API_KEY` | Optional | Enables Tamil AI features |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` locally, your domain in production |

---

## Testing

```bash
# Run all 84 unit tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run type-check
```

**Test coverage:**

| File | Tests | What's covered |
|------|-------|---------------|
| `run-rate.test.ts` | 21 | Working day calc, GREEN/AMBER/RED thresholds, edge cases |
| `utils.test.ts` | 7 | percentage(), formatNumber(), truncate() |
| `ai-schema.test.ts` | 8 | AI response schema, all 9 categories, confidence thresholds |
| `photo-auth.test.ts` | 35 | Buyer isolation (Company B vs C), supervisor unit scoping |
| `dashboard-aggregation.test.ts` | 13 | UTC date handling, PGRST201 FK regression |

---

## Security

- **RLS on all 15 tables** — database enforces role-based access regardless of API use
- **Private Storage bucket** — no public URLs; all photos served via 60s signed URLs
- **Buyer isolation** — token-scoped queries; buyers cannot see other buyers' data, enforced in both application logic and database policies
- **Server-side secrets** — `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` never reach the browser
- **Token security** — buyer access tokens stored as SHA-256 hashes only
- **Input validation** — Zod schemas on all API routes
- **Idempotent offline sync** — UUID `client_id` prevents duplicate production update records

---

## Production Notes

### Next.js Cache Components (v16)

All 13 server-rendered pages use this pattern:

```typescript
import { connection } from 'next/server'
export const instant = false

export default async function Page() {
  await connection()                        // must be BEFORE createClient()
  const supabase = await createClient()     // Supabase transport initializes here
  // ...
}
```

`connection()` must be called before `createClient()` to prevent Supabase from initializing its transport layer during Next.js's Partial Prerender phase, which would trigger unstable `Math.random()` errors in production.

### PostgREST FK Hint

`production_updates` has two FK columns to `profiles` (`supervisor_id` and `ai_corrected_by`). Without an explicit hint, PostgREST returns 0 rows silently (PGRST201):

```typescript
// Wrong — ambiguous, returns 0 rows
.select('*, supervisor:profiles(full_name)')

// Correct — explicit FK name
.select('*, supervisor:profiles!production_updates_supervisor_id_fkey(full_name)')
```

---

## Project Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── api/                 # Route handlers (REST API)
│   │   ├── ai/              # Tamil transcription + classification
│   │   ├── buyer-tokens/    # Secure token generation
│   │   ├── milestones/      # TNA date-change audit
│   │   ├── orders/          # Order creation
│   │   ├── photos/          # Upload + signed URL generation
│   │   └── updates/         # Production update submission
│   ├── buyer/[token]/       # Buyer read-only portal
│   ├── dashboard/           # Authenticated merchandiser/supervisor pages
│   └── login/               # Authentication screen
├── components/
│   ├── ai/                  # AI review panel
│   ├── auth/                # Login form
│   ├── buyer/               # Buyer portal view
│   ├── dashboard/           # KPIs, chart, warnings, updates
│   ├── layout/              # Sidebar, top nav, app shell
│   ├── orders/              # Order board, detail, TNA, run-rate
│   ├── photos/              # Secure photo components
│   ├── reports/             # PDF/Excel export
│   ├── settings/            # Settings view
│   ├── supervisor/          # Mobile update form
│   ├── tna/                 # TNA calendar
│   └── ui/                  # Design system primitives
├── hooks/
│   └── use-offline-queue.ts # IndexedDB offline sync hook
├── lib/
│   ├── offline-db.ts        # Dexie database schema
│   ├── photo-auth.ts        # Photo authorization logic
│   ├── run-rate.ts          # Run-rate calculation engine
│   ├── supabase/            # Client, server, middleware helpers
│   ├── token-utils.ts       # SHA-256 token hashing
│   └── utils.ts             # Shared utilities
├── types/
│   └── database.ts          # TypeScript types for all DB tables
supabase/
├── migrations/              # 001 schema, 002 RLS, 003 private storage
└── seed.sql                 # Base data (buyers, units, orders)
scripts/
├── seed.ts                  # Demo user + data seeding
├── rls-check.ts             # Authenticated RLS diagnostic
└── diagnose.ts              # DB state checker
```

---

## Deployment

The app deploys automatically to Vercel on every push to `master`.

See [deployment.md](./deployment.md) for the complete step-by-step guide including:
- Vercel environment variable configuration
- Supabase Auth URL setup
- Storage bucket configuration
- Buyer access link regeneration after deployment

---

## Roadmap

- [ ] Holiday calendar (Pongal, Diwali exclusions from working days)
- [ ] Supabase Realtime for live dashboard updates
- [ ] PWA for offline-capable supervisor app
- [ ] Full Tamil UI localisation
- [ ] Image compression before upload
- [ ] API webhooks for ERP integration

---

## License

Private — StitchOps internship evaluation project.

**Author:** Mehul8864 · [GitHub](https://github.com/Mehul8864/knitwear-production-tracker)

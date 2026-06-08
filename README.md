# PromoSG 🇸🇬

A mobile-first **Progressive Web App** that aggregates promotions, deals, events and
discounts across Singapore and presents them on a clean, Apple-Calendar-inspired interface.
Stop scrolling through Telegram channels and a dozen deal sites — just open the calendar and
see what's on, any day.

> **Status:** Calendar-centric MVP. The full UI (calendar, dashboard, search, saved, auth,
> dark mode, PWA install) runs on live Supabase data. Data ingestion, AI extraction, push
> delivery, map and admin are scaffolded behind clean interfaces to extend next.

---

## Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Framework      | Next.js 15 (App Router, Server Actions, RSC) |
| Language       | TypeScript (strict) |
| Styling        | Tailwind CSS + shadcn/ui (Radix primitives) |
| Backend        | Supabase — Postgres, Auth, RLS |
| Dates          | date-fns |
| PWA            | Serwist (`@serwist/next`) |
| Tests          | Vitest + Testing Library |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase URL + keys (see "Supabase setup" below)

# 3. Create the schema + seed data
#    Option A: psql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
#    Option B: paste both files into the Supabase SQL editor and run

# 4. Run
npm run dev          # http://localhost:3000
```

Without Supabase keys the app still boots and shows a friendly setup notice instead of data.

### Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** — copy these into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)
3. **Database → Connection string** — copy the Postgres URL into `SUPABASE_DB_URL` (used to
   run `seed.sql` via psql).
4. Run `supabase/migrations/0001_init.sql` then `supabase/seed.sql`.
5. **Auth** — enable Email provider (magic link). Add your site URL and
   `…/auth/callback` to the allowed redirect URLs.

The schema (`supabase/migrations/0001_init.sql`) includes:
- `promotions` with a generated `tsvector` `search_vector` (GIN-indexed) for full-text search,
  plus indexes on `(status, start_date, end_date)`, `category` and `tags`.
- `profiles` (auto-created on signup via trigger), `saved_promotions`, and `sources` /
  `ingestion_logs` for the ingestion/admin scaffold.
- **Row Level Security**: active promotions are public; profiles and saved promotions are
  owner-only.

---

## Architecture

```
app/                      Routes (App Router)
  dashboard/              Today · New · Ending soon · Trending · Saved
  calendar/               PRIMARY — month / week / day views
  promotions/[id]/        Promotion detail
  search/                 Full-text + faceted search
  saved/                  User bookmarks
  auth/                   Magic-link login + callback
  api/cron/expire/        Daily expiry job (CRON_SECRET protected)
  manifest.ts, sw.ts      PWA manifest + service worker
components/
  calendar/               CalendarRoot, MonthGrid, WeekView, DayView, chips, header…
  promotions/             PromoCard, lists, CategoryBadge, SavedButton
  search/ layout/ ui/     Search controls, app shell, shadcn primitives
lib/
  calendar/               Date math + promotion→day grouping (the calendar engine)
  promotions/             Queries, Server Actions, mappers, search-param parsing
  supabase/               server / client / middleware clients + env guard
  ingestion/              Adapters + extractor + pipeline (scaffold)
  notifications/          Push payload + preference types (scaffold)
  constants.ts            CATEGORY_META — single source of truth for category colors
supabase/                 SQL migrations + seed
tests/                    Vitest unit tests
```

### The calendar (the differentiator)

- **View + focused date live in the URL** (`/calendar?view=month&date=2026-06-08`) so the
  server fetches exactly the promotions in the visible window (`getPromotionsInRange`) and
  views are shareable / back-button friendly.
- `lib/calendar/group.ts#groupPromotionsByDay` buckets each promotion onto **every day in its
  `[start_date, end_date]` interval**, so multi-day promos span cells.
- **Month** renders a padded 6-week grid (Apple-Calendar style) with category-colored chips
  and a per-day count; **Week** shows stacked chips per day; **Day** lists full cards.
- Tapping a day opens a dialog with that day's active promotions.
- Category colors come from one `CATEGORY_META` map used by chips, badges, dots and the
  legend — change a color once, it updates everywhere.

### Data ingestion (scaffold)

`lib/ingestion` defines the extensible pipeline:
`SourceAdapter` (Telegram / RSS / Website / EventSite) → `PromotionExtractor` →
normalize → dedupe (`IngestionPipeline`). The MVP ships a deterministic `RegexExtractor`;
drop an LLM-backed extractor behind the same `PromotionExtractor` interface to upgrade
extraction without touching the pipeline. Adapters currently return `[]` with a clearly
marked `TODO` for live fetching.

### Notifications (scaffold)

`lib/notifications/types.ts` defines the `PushPayload` contract and preference model. The
service worker (`app/sw.ts`) already handles `push` + `notificationclick`. Triggers
(ending-tomorrow, new-in-favourite-category) and delivery are wired later.

### Automatic expiry

`POST /api/cron/expire` (also accepts `GET`) flips `status` from `active` → `archived` for
promotions whose `end_date` has passed. History is preserved; the frontend only queries
`active`. Protect it with `CRON_SECRET`.

---

## PWA

- `app/manifest.ts` → installable with standalone display, theme color and maskable icons
  (`public/icons/icon-{192,512}.png`).
- `app/sw.ts` (Serwist) precaches the app shell, runtime-caches navigations/data, and handles
  push notifications. The service worker is disabled in development and built on `npm run
  build`.
- An "Add to Home Screen" prompt appears when the browser fires `beforeinstallprompt`.

---

## Deployment

### Vercel (recommended)

1. Push to GitHub and import the repo into Vercel.
2. Add the env vars from `.env.example` in **Project → Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your production URL).
3. Deploy. `npm run build` generates the service worker automatically.
4. **Daily expiry cron** — add to `vercel.json`:
   ```json
   { "crons": [{ "path": "/api/cron/expire", "schedule": "0 0 * * *" }] }
   ```
   and set `CRON_SECRET`; Vercel sends it as the `Authorization: Bearer` header.

### Supabase scheduled job (alternative)

Use `pg_cron` + `pg_net` to `POST` to `/api/cron/expire` daily with the
`Authorization: Bearer <CRON_SECRET>` header.

---

## Testing

```bash
npm run test       # 31 unit tests
```

Covers the calendar date math and day-grouping engine, category metadata, search-param
parse/serialize round-trips, date formatting, and the ingestion extractor + dedupe pipeline.

---

## Roadmap (next pass)

- Live source adapters (Telegram / RSS / scraping) + LLM extraction behind `PromotionExtractor`
- Web-push delivery + notification triggers
- Map view with location clustering
- Admin panel (approve / edit / manage sources / view ingestion logs)

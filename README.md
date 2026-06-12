# PromoSG 🇸🇬

A mobile-first **Progressive Web App** that aggregates promotions, deals, events and
discounts across Singapore and presents them on a clean, Apple-Calendar-inspired interface.
Stop scrolling through Telegram channels and a dozen deal sites — just open the calendar and
see what's on, any day.

> **Status:** Calendar-centric MVP, now with a clustered **map view**, curated food/gems
> guides, and **Community Spots** — Swarm-style restaurant check-ins. The full UI (calendar,
> dashboard, search, saved, map, spots, email+password auth, dark mode, PWA install) runs on
> live Supabase data. Data ingestion, AI extraction, push delivery and admin are scaffolded
> behind clean interfaces to extend next.

---

## Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Framework      | Next.js 15 (App Router, Server Actions, RSC) |
| Language       | TypeScript (strict) |
| Styling        | Tailwind CSS + shadcn/ui (Radix primitives) |
| Backend        | Supabase — Postgres, Auth, RLS |
| Dates          | date-fns |
| Maps           | Leaflet + react-leaflet + markercluster (CARTO tiles) |
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
#    Apply every migration in order, then seed. Use the bundled runner:
node --env-file=.env.local scripts/run-sql.mjs `
  supabase/migrations/0001_init.sql `
  supabase/migrations/0002_ingestion.sql `
  supabase/migrations/0003_external_id.sql `
  supabase/migrations/0004_phase2.sql `
  supabase/migrations/0005_content_type.sql `
  supabase/migrations/0006_check_ins.sql `
  supabase/seed.sql
#    (or paste each file into the Supabase SQL editor and run)

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
| `node --env-file=.env.local scripts/e2e-checkins.mjs` | End-to-end RLS test for Community Spots |

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
5. **Auth** — enable the Email provider. Sign-up uses **email + password** with instant
   confirmation (no confirmation email): the server action creates an already-confirmed user
   via the admin API, then signs them in. Add your site URL and `…/auth/callback` to the
   allowed redirect URLs.

The schema (across `supabase/migrations/*`) includes:
- `promotions` with a trigger-maintained `tsvector` `search_vector` (GIN-indexed) for
  full-text search, plus indexes on `(status, start_date, end_date)`, `category` and `tags`.
- `profiles` (auto-created on signup via trigger), `saved_promotions`, `user_preferences`,
  `engagement_events`, and `sources` / `ingestion_logs` for the ingestion/admin scaffold.
- `check_ins` — user-generated restaurant check-ins for **Community Spots** (see below).
- **Row Level Security**: active promotions are public; profiles, preferences and saved
  promotions are owner-only; check-ins are **public-read, owner-write**.

---

## Architecture

```
app/                      Routes (App Router)
  dashboard/              Today · New · Ending soon · Trending · Saved
  calendar/               PRIMARY — month / week / day views
  promotions/[id]/        Promotion detail
  search/                 Full-text + faceted search
  saved/                  User bookmarks
  map/                    Leaflet map — Deals / Food / Gems / Spots layers + clustering
  eat/ gems/              Curated food recommendations + hidden-gems guides
  spots/                  Community Spots feed (user check-ins, All / Mine)
  check-in/               Check-in flow — GPS + draggable pin + rating + note
  auth/                   Email+password login + callback
  api/cron/expire/        Daily expiry job (CRON_SECRET protected)
  manifest.ts, sw.ts      PWA manifest + service worker
components/
  calendar/               CalendarRoot, MonthGrid, WeekView, DayView, chips, header…
  promotions/             PromoCard, lists, CategoryBadge, SavedButton
  map/                    MapRoot + MapView (dynamic, SSR-off Leaflet)
  checkins/               CheckInForm, PickLocationMap, CheckInCard, SpotsClient, fab
  search/ layout/ ui/     Search controls, app shell, shadcn primitives
lib/
  calendar/               Date math + promotion→day grouping (the calendar engine)
  promotions/             Queries, Server Actions, mappers, search-param parsing
  checkins/               Check-in types, queries + Server Actions (create / delete)
  map/                    StaticPin model + food/gem/check-in → pin adapters
  supabase/               server / client / middleware clients + env guard
  ingestion/              Adapters + extractor + pipeline (scaffold)
  notifications/          Push payload + preference types (scaffold)
  constants.ts            CATEGORY_META — single source of truth for category colors
supabase/                 SQL migrations + seed
scripts/                  run-sql + e2e-checkins runners
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

### Community Spots — check-ins (Swarm-style)

A lightweight, location-first way for users to log restaurants/cafés they love and share them
publicly — think Swarm, focused on Singapore food.

- **Check in** (`/check-in`): on open it requests GPS via the browser geolocation API and drops
  a **draggable Leaflet pin** to fine-tune the exact spot; add venue name, a 1–5 star rating,
  cuisine, area and a note. Auth-gated — signed-out users are redirected to login.
- **Feed** (`/spots`): newest-first card grid of every public check-in, with an **All / Mine**
  toggle so each user can browse their own food history. Owners get a delete button; relative
  timestamps via date-fns; one-tap "Open in Maps".
- **Map** (`/map` → **Spots** layer): every check-in becomes a clustered pin alongside Deals,
  Food and Gems — reusing the existing `StaticPin` abstraction (`lib/map/static-pins.ts`).
- **Entry point**: a floating "+" check-in FAB (signed-in only) plus a "Spots" nav item.

**Data & security** (`supabase/migrations/0006_check_ins.sql`):
- `check_ins` table — **public-read, owner-write** RLS. INSERT/UPDATE carry `WITH CHECK
  (auth.uid() = user_id)`, so a forged `user_id` is rejected; the Server Action derives the
  user from the session, never the request body.
- The poster's display name is **snapshotted** onto each row (`author_name`) so the public
  feed never joins the owner-only `profiles` table — no email exposure.
- Server-side validation on every field, incl. a Singapore coordinate bounding box.
- `scripts/e2e-checkins.mjs` proves the full RLS path end-to-end (owner insert, forged-insert
  denial, public read, cross-user delete denial, owner delete) against the live database.

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
- Community Spots: rate-limiting on check-in creation + a report/moderation flow before scaling
- Photo uploads for check-ins (Supabase Storage) + friends / social graph
- Admin panel (approve / edit / manage sources / view ingestion logs)

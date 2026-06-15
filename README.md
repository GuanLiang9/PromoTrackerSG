# PromoSG 🇸🇬

A mobile-first **Progressive Web App** that aggregates promotions, deals, events and
discounts across Singapore and presents them on a clean, Apple-Calendar-inspired interface.
Stop scrolling through Telegram channels and a dozen deal sites — just open the calendar and
see what's on, any day.

> **Status:** Calendar-centric MVP, now with a clustered **map view**, curated food/gems
> guides, and a full **Swarm-style social layer** — restaurant check-ins with smart
> auto-populated venues, a personal **timeline**, **profiles** (avatar, bio, level), a
> **friends** graph, in-app **celebrations**, and a rewards system (streaks, points, levels,
> badges, quests, global + friends leaderboards). The full UI runs on live Supabase data with
> Row Level Security. Data ingestion, AI extraction, push delivery and admin are scaffolded
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
  supabase/migrations/0007_image_overrides.sql `
  supabase/migrations/0008_rewards.sql `
  supabase/migrations/0009_profiles.sql `
  supabase/migrations/0010_friends.sql `
  supabase/migrations/0011_badges.sql `
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
| `node --env-file=.env.local scripts/e2e-social.mjs` | End-to-end RLS test for profiles, friends, badges, leaderboard view + avatar Storage |
| `node scripts/deploy-pages.mjs` | Build + deploy to Cloudflare Pages (reads CF creds from `.env.local`) |

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
- `profiles` (auto-created on signup via trigger) carrying `display_name`, `username` (unique),
  `bio` and `avatar_url`; `saved_promotions`, `user_preferences`, `engagement_events`, and
  `sources` / `ingestion_logs` for the ingestion/admin scaffold.
- `public_profiles` — a **security-definer view** exposing only the safe public columns
  (name/username/avatar/bio, never email) so feeds, leaderboards and friend search can show
  live identities without touching the owner-only `profiles` table.
- `check_ins` — user-generated restaurant check-ins for **Community Spots** (see below).
- `friendships` — request/accept friend graph (`pending` → `accepted`); `user_badges` —
  persisted badge unlocks so each achievement celebrates exactly once.
- `avatars` **Storage bucket** — public-read, owner-write scoped to a `{uid}/` folder prefix.
- **Row Level Security**: active promotions are public; profiles, preferences and saved
  promotions are owner-only; check-ins and badges are **public-read, owner-write**; friendship
  rows are visible only to the two parties.

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
  spots/                  Community Spots feed (user check-ins, All / Friends / Mine)
  check-in/               Check-in flow — GPS + draggable pin + auto-populated venue + rating
  profile/  u/[id]/       Own profile (Timeline · Badges · Friends) + public profiles
  rewards/                Streaks, points/levels, badges, quests, global+friends leaderboard
  auth/                   Email+password login + callback
  api/venues/nearby/      Free nearby-venue lookup (curated + OSM Overpass + Nominatim area)
  api/cron/expire/        Daily expiry job (CRON_SECRET protected)
  manifest.ts, sw.ts      PWA manifest + service worker
components/
  calendar/               CalendarRoot, MonthGrid, WeekView, DayView, chips, header…
  promotions/             PromoCard, lists, CategoryBadge, SavedButton
  map/                    MapRoot + MapView (dynamic, SSR-off Leaflet)
  checkins/               CheckInForm (+ nearby picker), PickLocationMap, CheckInCard, SpotsClient
  profile/                Avatar, ProfileHeader, ProfileTabs, EditProfileSheet
  friends/                FriendsTab, FriendButton
  timeline/               CheckInTimeline (personal food history)
  feedback/               ToastProvider + CelebrationModal (confetti)
  rewards/                RewardsClient, BadgesGrid
  search/ layout/ ui/     Search controls, app shell, shadcn primitives
lib/
  calendar/               Date math + promotion→day grouping (the calendar engine)
  promotions/             Queries, Server Actions, mappers, search-param parsing
  checkins/               Check-in types, queries + Server Actions (create returns reward delta)
  profiles/               Profile queries + Server Actions (update, avatar upload)
  friends/                Friend queries + Server Actions (request / accept / remove / search)
  venues/                 Nearby venues — curated ranking + OSM Overpass + Nominatim
  rewards/                compute, levels, badges, quests, delta, leaderboard queries
  timeline/               Promotion + check-in day buckets
  map/                    StaticPin model + food/gem/check-in → pin adapters
  supabase/               server / client / middleware clients + env guard
  ingestion/              Adapters + extractor + pipeline (scaffold)
  notifications/          Push payload + preference types (scaffold)
  constants.ts            CATEGORY_META — single source of truth for category colors
supabase/                 SQL migrations + seed
scripts/                  run-sql + e2e-checkins + e2e-social + deploy runners
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
  a **draggable Leaflet pin** to fine-tune the exact spot. A **"Nearby" picker** then offers
  real venues around you (see *Smart check-in* below) — tap one to auto-fill venue, cuisine and
  area, so you only rate + write a note. Auth-gated.
- **Feed** (`/spots`): newest-first card grid of public check-ins with an **All / Friends / Mine**
  toggle. Each author links to their profile. Owners get a delete button; relative timestamps via
  date-fns; one-tap "Open in Maps".
- **Map** (`/map` → **Spots** layer): every check-in becomes a clustered pin alongside Deals,
  Food and Gems — with its own **All / Friends / Mine** scope filter, reusing the existing
  `StaticPin` abstraction (`lib/map/static-pins.ts`).
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

### Smart check-in (auto-populated venues, free)

When you drop a check-in pin, the form calls `GET /api/venues/nearby?lat=&lng=`
(`lib/venues/nearby.ts`) which merges three **key-free** sources, ranked by distance:

1. **Curated venues** — the bundled 343 SG + JB food spots (`lib/food/*`), richest metadata.
2. **OpenStreetMap Overpass** — live nearby POIs (`amenity=restaurant|cafe|fast_food|food_court|
   bar|pub|ice_cream` within ~200 m), with OSM `cuisine` tags mapped onto the app's `CuisineType`.
3. **Nominatim reverse-geocode** — fills the *area* field from the coordinate's neighbourhood.

Results are deduped by name and cached server-side by rounded lat/lng to respect the free
services' rate limits. No Google Places key, no billing.

### Profiles & friends

- **Profiles** (`/profile`, public `/u/[id]`): avatar, display name, `@username`, bio, level
  title + progress, points, rank and quick stats, with **Timeline · Badges · Friends** tabs.
- **Avatars** upload to the `avatars` Storage bucket (owner-write to a `{uid}/` prefix,
  public-read) via a Server Action with server-side type/size validation.
- **Timeline** (`components/timeline`): your full check-in history grouped Today / Yesterday /
  This week / by month on a vertical rail — venue, rating, note, area, time, Open-in-Maps.
- **Friends**: request → accept graph (`friendships`). Search people by name/`@username`,
  send/accept/cancel/remove, and scope the feed, map and leaderboard to **friends only**.
  Friendship rows are RLS-visible only to the two parties.

### Celebrations (make it feel alive)

A lightweight `ToastProvider` + `CelebrationModal` (`components/feedback`, CSS confetti, no heavy
deps) fire on meaningful moments. `createCheckIn` recomputes stats, diffs them against the
persisted `user_badges`, and returns a **reward delta** (`lib/rewards/delta.ts`): points gained,
newly-crossed badges, a level-up, or a streak milestone (3/7/30/100). Each badge is persisted so
it celebrates **exactly once**, even across sessions.

### Data ingestion (scaffold)

`lib/ingestion` defines the extensible pipeline:
`SourceAdapter` (Telegram / RSS / Website / EventSite) → `PromotionExtractor` →
normalize → dedupe (`IngestionPipeline`). The MVP ships a deterministic `RegexExtractor`;
drop an LLM-backed extractor behind the same `PromotionExtractor` interface to upgrade
extraction without touching the pipeline. Adapters currently return `[]` with a clearly
marked `TODO` for live fetching.

### Rewards (Swarm-style gamification)

Turns daily check-ins into a game — entirely **derived from `check_ins`**, no extra writes.

- **Streaks** — consecutive-day check-in streak on the `Asia/Singapore` day boundary (current +
  longest + a "last 7 days" strip and a "don't break it today" nudge).
- **Points & levels** — `points = check_ins×10 + distinctVenues×15 + distinctDays×5`, rolled into
  food-explorer levels (🌱 Newbie → 👑 Legend).
- **Badges** — ~11 unlockable stickers (first check-in, 7-day streak, area explorer, cuisine
  variety, "Regular Here", Centurion…), persisted in `user_badges` for once-only celebrations.
- **Weekly quests** (`lib/rewards/quests.ts`) — rotating goals (streak keeper, flavour tour,
  neighbourhood hop, honest critic) computed per ISO week from the user's rows, with progress bars.
- **Leaderboard** — **Global** + **Friends** scopes, showing each player's avatar and level emoji
  and linking to their profile; the signed-in user is pinned even when outside the global top.

The engine lives in `lib/rewards/` (pure, unit-tested, client-safe). Personal stats are computed
in JS from the user's own rows; the leaderboard reads one aggregate view,
`user_check_in_stats` (`supabase/migrations/0008_rewards.sql`, `security_invoker` so it inherits
check_ins' public-read RLS — only counts + the public author name, no emails). The points formula
is **identical** in the view and in `lib/rewards/compute.ts`, so personal and leaderboard totals
always match. Surfaced at `/rewards`, with a top-bar trophy that shows the live streak flame.

### Promo images (relevant + learnable)

Every imageless promo is given an on-topic stock photo so no card renders bare. Resolution
runs in priority order (`lib/ingestion/image-resolver.ts#resolveImage`):

1. **Learned overrides** — a `image_overrides` keyword→image table consulted first.
2. **LLM image subject** — the OpenRouter extractor returns an `imageSubject` (e.g. "tonkotsu
   ramen bowl") in the *same* call it already makes per new promo (zero extra API cost), so the
   photo reflects the model's read of the post, not just a title keyword.
3. **Title/description keyword** match against the curated Unsplash dictionary.
4. **Per-category default**.

**Learning loop:** when an image is wrong, correct it once —
`node scripts/set-image-override.mjs "<keyword>" "<unsplash-id|url>"`. The script persists the
override *and* immediately re-images every existing active promo that matches; all future
ingested promos pick it up automatically. The ingest route reports `image_sources` (how many
came from override/subject/keyword/category) for QA.

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

### Cloudflare Pages (live)

Deployed at **https://promosg.pages.dev** via OpenNext + Wrangler.

1. Put `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env.local`.
2. Set the runtime secrets on the Pages project once (`node scripts/set-pages-secrets.mjs`):
   Supabase keys, `OPENROUTER_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Build + deploy:
   ```bash
   node scripts/deploy-pages.mjs      # opennextjs-cloudflare build → wrangler pages deploy
   ```
   `npm run build` generates the service worker automatically as part of the build.

### Vercel (alternative)

Import the repo, add the env vars from `.env.example`, deploy. For the daily expiry cron add
`{ "crons": [{ "path": "/api/cron/expire", "schedule": "0 0 * * *" }] }` to `vercel.json` and set
`CRON_SECRET` (sent as the `Authorization: Bearer` header).

### Supabase scheduled job (alternative cron)

Use `pg_cron` + `pg_net` to `POST` to `/api/cron/expire` daily with the
`Authorization: Bearer <CRON_SECRET>` header.

---

## Testing

```bash
npm run test                                          # unit tests (Vitest)
node --env-file=.env.local scripts/e2e-checkins.mjs   # check-ins RLS, live DB
node --env-file=.env.local scripts/e2e-social.mjs     # profiles/friends/badges/leaderboard/Storage RLS, live DB
```

Unit tests cover the calendar date math and day-grouping engine, category metadata,
search-param round-trips, date formatting, the rewards compute engine, and the ingestion
extractor + dedupe pipeline. The two E2E scripts assert the actual Row Level Security policies,
views and Storage rules end-to-end against the live database (creating and cleaning up
throwaway users).

---

## Roadmap (next pass)

- Live source adapters (Telegram / RSS / scraping) + LLM extraction behind `PromotionExtractor`
- Web-push delivery + notification triggers (streak reminders, friend activity)
- Community Spots: rate-limiting on check-in creation + a report/moderation flow before scaling
- Photo uploads on check-ins (Supabase Storage) + a friend activity feed
- Admin panel (approve / edit / manage sources / view ingestion logs)

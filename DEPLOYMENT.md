# PromoSG — Deployment & Operations

## Live URLs
- **App:** https://promosg.guanliang976.workers.dev
- **Scheduled cron Worker:** `promosg-cron`
  - **Daily** (`0 18 * * *`, 02:00 SGT) — archive expired promos (free, no AI)
  - **Weekly** (`30 18 * * SUN`, Mon 02:30 SGT) — ingest new deals

## Keeping AI usage in the free zone
- Ingestion runs **weekly**, not continuously.
- Each post's source id (`external_id`) is stored; recurring runs **skip
  already-seen posts before the LLM is ever called**, so AI is only spent on
  genuinely new deals (typically a handful per week).
- A hard per-run cap (`maxItems`, default 25) bounds the worst case.
- The free OpenRouter model is used with no retries on the Worker; anything it
  can't handle falls back to the free regex extractor.
- Net effect: well within OpenRouter's free tier with a $0 spend limit.

## Stack
- **Frontend/SSR:** Next.js 15 (App Router) deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`.
- **Database/Auth:** Supabase (Postgres + RLS). Project `abbbcmpkfklwckbknmrv` (ap-southeast-1).
- **AI extraction:** OpenRouter free models (`meta-llama/llama-3.3-70b-instruct:free`), with a deterministic regex fallback.

## Environment variables
Local dev reads `.env.local`. The Worker reads:
- **vars** (in `wrangler.jsonc`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `OPENROUTER_MODEL`
- **secrets** (set via `wrangler secret bulk`): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `OPENROUTER_API_KEY`

> Note: the direct Postgres host `db.*.supabase.co` is IPv6-only. Use the IPv4
> **pooler** for psql/migrations: `aws-1-ap-southeast-1.pooler.supabase.com:5432`
> with user `postgres.abbbcmpkfklwckbknmrv`.

## Common tasks

### Run database migrations / seed (Node, no psql needed)
```powershell
$env:SUPABASE_DB_URL="postgresql://postgres.abbbcmpkfklwckbknmrv:<pw>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
node scripts/run-sql.mjs supabase/migrations/0001_init.sql supabase/migrations/0002_ingestion.sql supabase/migrations/0003_external_id.sql supabase/seed.sql
```

### Local dev
```powershell
npm run dev   # http://localhost:3000 (or next free port)
```

### Build + deploy the app
```powershell
$env:CLOUDFLARE_API_TOKEN="<token>"; $env:CLOUDFLARE_ACCOUNT_ID="<acct>"
npm run cf:deploy
```

### Deploy the cron Worker
```powershell
npx wrangler deploy -c cron-worker/wrangler.jsonc
npx wrangler secret bulk cron-worker/.cf-secrets.json -c cron-worker/wrangler.jsonc
```

### Trigger ingestion / expiry manually
```
GET https://promosg.guanliang976.workers.dev/api/cron/ingest?secret=<CRON_SECRET>
GET https://promosg.guanliang976.workers.dev/api/cron/expire?secret=<CRON_SECRET>
```

## Ingestion pipeline
`lib/ingestion/`
- **sources.ts** — public Telegram channels (read via `t.me/s/<channel>` web preview, no auth) + RSS feeds.
- **adapters.ts** — `TelegramAdapter`, `RssAdapter`.
- **openrouter-extractor.ts** — LLM extraction → structured promo JSON; regex fallback.
- **pipeline.ts** — fetch → skip already-seen (`external_id`) → extract → dedupe (`dedupe_key`), capped per run to stay under the Workers 50-subrequest limit.
- **upsert.ts** — maps to `promotions` rows and upserts on `dedupe_key`.

## Known limitations
- **Free OpenRouter models are rate-limited (429)**: when the shared free pool is
  busy, items fall back to regex extraction (cleaner titles still, but coarser
  category/date inference). Adding ≥10 credits to OpenRouter unlocks far more
  reliable free-model throughput.
- Specific promo dates are often not parsed by the free model; such promos
  default to a 30-day active window from ingestion date.
- Worker per-run cap (default 25 items): coverage builds over successive weekly runs.

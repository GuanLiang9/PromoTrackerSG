-- Ingestion support: a stable dedupe key so re-runs upsert instead of duplicate.
alter table public.promotions
  add column if not exists dedupe_key text;

-- Full (non-partial) unique index so `ON CONFLICT (dedupe_key)` matches it.
-- Postgres treats NULLs as distinct, so existing/seeded rows (dedupe_key IS
-- NULL) are unaffected and can coexist.
drop index if exists public.promotions_dedupe_key_idx;
create unique index if not exists promotions_dedupe_key_idx
  on public.promotions (dedupe_key);

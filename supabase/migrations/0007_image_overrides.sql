-- PromoSG: learned image overrides
-- A small keyword → image map that the ingestion/backfill resolver consults
-- FIRST, before the static dictionary. Fix a wrong image once (set an override
-- for the offending brand/dish/subject) and every future promo — and a re-run of
-- the backfill — reuses the corrected image. This is the "learning" layer.
-- Run: node scripts/run-sql.mjs supabase/migrations/0007_image_overrides.sql

create table if not exists public.image_overrides (
  keyword    text primary key,          -- lowercased brand / dish / subject substring
  image_url  text not null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse the shared updated_at trigger fn from 0001_init.sql.
drop trigger if exists image_overrides_set_updated_at on public.image_overrides;
create trigger image_overrides_set_updated_at
  before update on public.image_overrides
  for each row execute function public.set_updated_at();

alter table public.image_overrides enable row level security;

-- Public read (image mappings are non-sensitive; lets any context resolve them).
-- Writes happen via the service role only (no insert/update policy) — set through
-- scripts/set-image-override.mjs.
drop policy if exists "image_overrides public read" on public.image_overrides;
create policy "image_overrides public read"
  on public.image_overrides for select using (true);

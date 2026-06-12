-- PromoSG: user check-ins (Swarm-style community "Spots")
-- Run with: node scripts/run-sql.mjs supabase/migrations/0006_check_ins.sql

create table if not exists public.check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the poster's display name at insert time. Avoids exposing the
  -- owner-only `profiles` table (and emails) via a public join on the feed.
  author_name text not null,
  venue_name  text not null,
  note        text,
  rating      smallint check (rating between 1 and 5),
  cuisine     text,
  area        text,
  latitude    numeric(9,6) not null,
  longitude   numeric(9,6) not null,
  created_at  timestamptz not null default now()
);

create index if not exists check_ins_created_idx on public.check_ins (created_at desc);
create index if not exists check_ins_user_idx    on public.check_ins (user_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.check_ins enable row level security;

-- Public read: this is a community feed.
drop policy if exists "check_ins public read" on public.check_ins;
create policy "check_ins public read"
  on public.check_ins for select using (true);

-- Owner-only writes (user_id must match the session).
drop policy if exists "check_ins owner insert" on public.check_ins;
create policy "check_ins owner insert"
  on public.check_ins for insert with check (auth.uid() = user_id);
drop policy if exists "check_ins owner update" on public.check_ins;
create policy "check_ins owner update"
  on public.check_ins for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "check_ins owner delete" on public.check_ins;
create policy "check_ins owner delete"
  on public.check_ins for delete using (auth.uid() = user_id);

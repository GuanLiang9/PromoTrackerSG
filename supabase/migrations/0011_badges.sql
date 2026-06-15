-- PromoSG: persisted earned badges (so we can celebrate NEW ones exactly once)
-- Badges are otherwise computed on the fly from check_ins; this table only records
-- the first time each badge is unlocked, per user.
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0011_badges.sql

create table if not exists public.user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

-- Public read (badges are shown on public profiles).
drop policy if exists "user_badges public read" on public.user_badges;
create policy "user_badges public read"
  on public.user_badges for select using (true);

-- Owner-only insert (the server records new unlocks for the signed-in user).
drop policy if exists "user_badges owner insert" on public.user_badges;
create policy "user_badges owner insert"
  on public.user_badges for insert with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

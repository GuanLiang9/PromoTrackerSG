-- PromoSG Phase 2: scoring, personalization, engagement, daily summary, AI budget
-- Run with: node scripts/run-sql.mjs supabase/migrations/0004_phase2.sql

-- ── promotions: scoring columns ──────────────────────────────────────────────
alter table public.promotions add column if not exists discount_pct   numeric;
alter table public.promotions add column if not exists savings_amount numeric;
alter table public.promotions add column if not exists base_score     smallint;
alter table public.promotions add column if not exists score_reasons  jsonb not null default '[]';
alter table public.promotions add column if not exists saved_count    int   not null default 0;

create index if not exists promotions_base_score_idx
  on public.promotions (base_score desc nulls last);

-- ── saved_count maintenance trigger ──────────────────────────────────────────
create or replace function public.bump_saved_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.promotions set saved_count = saved_count + 1
      where id = new.promotion_id;
  elsif tg_op = 'DELETE' then
    update public.promotions set saved_count = greatest(saved_count - 1, 0)
      where id = old.promotion_id;
  end if;
  return null;
end $$;

drop trigger if exists saved_promotions_count on public.saved_promotions;
create trigger saved_promotions_count
  after insert or delete on public.saved_promotions
  for each row execute function public.bump_saved_count();

-- Backfill existing counts.
update public.promotions p set saved_count = sub.n
  from (select promotion_id, count(*)::int n from public.saved_promotions group by promotion_id) sub
  where sub.promotion_id = p.id;

-- ── user_preferences ─────────────────────────────────────────────────────────
create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  interests  text[] not null default '{}',
  home_lat   numeric(9,6),
  home_lng   numeric(9,6),
  updated_at timestamptz not null default now()
);

-- ── engagement_events ────────────────────────────────────────────────────────
create table if not exists public.engagement_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  type         text not null check (type in ('view','click','save')),
  created_at   timestamptz not null default now()
);
create index if not exists engagement_events_user_idx
  on public.engagement_events (user_id, created_at desc);

-- ── daily_summaries (public read) ────────────────────────────────────────────
create table if not exists public.daily_summaries (
  summary_date date primary key,
  content      jsonb not null default '{}',
  source       text,
  created_at   timestamptz not null default now()
);

-- ── ai_usage (service-role only) ─────────────────────────────────────────────
create table if not exists public.ai_usage (
  usage_date date primary key,
  calls      int not null default 0
);

-- ── updated_at trigger on user_preferences ───────────────────────────────────
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.user_preferences  enable row level security;
alter table public.engagement_events enable row level security;
alter table public.daily_summaries   enable row level security;
alter table public.ai_usage          enable row level security;

-- user_preferences: owner only.
drop policy if exists "own prefs select" on public.user_preferences;
create policy "own prefs select"
  on public.user_preferences for select using (auth.uid() = user_id);
drop policy if exists "own prefs insert" on public.user_preferences;
create policy "own prefs insert"
  on public.user_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "own prefs update" on public.user_preferences;
create policy "own prefs update"
  on public.user_preferences for update using (auth.uid() = user_id);

-- engagement_events: owner can insert + read own.
drop policy if exists "own events select" on public.engagement_events;
create policy "own events select"
  on public.engagement_events for select using (auth.uid() = user_id);
drop policy if exists "own events insert" on public.engagement_events;
create policy "own events insert"
  on public.engagement_events for insert with check (auth.uid() = user_id);

-- daily_summaries: public read; writes via service role only.
drop policy if exists "summaries are public" on public.daily_summaries;
create policy "summaries are public"
  on public.daily_summaries for select using (true);

-- ai_usage: no policies → service role only.

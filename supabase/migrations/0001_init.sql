-- PromoSG initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type promo_category as enum (
    'food_beverage','shopping','attractions','events',
    'travel','credit_card','entertainment','lifestyle'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_status as enum ('draft','pending','active','archived');
exception when duplicate_object then null; end $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    promo_category not null,
  start_date  date not null,
  end_date    date not null,
  location    text,
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  image_url   text,
  source_name text,
  source_url  text,
  tags        text[] not null default '{}',
  terms       text,
  status      promo_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Full-text search vector, maintained by a trigger (see below). A trigger is
  -- used instead of a GENERATED column because to_tsvector() is not accepted as
  -- immutable in a generated-column expression on managed Postgres.
  search_vector tsvector,
  constraint promotions_dates_chk check (end_date >= start_date)
);

create index if not exists promotions_status_dates_idx
  on public.promotions (status, start_date, end_date);
create index if not exists promotions_category_idx
  on public.promotions (category);
create index if not exists promotions_search_idx
  on public.promotions using gin (search_vector);
create index if not exists promotions_tags_idx
  on public.promotions using gin (tags);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_promotions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  promotion_id  uuid not null references public.promotions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, promotion_id)
);
create index if not exists saved_promotions_user_idx
  on public.saved_promotions (user_id);

-- Sources + ingestion logs (used by the ingestion/admin scaffold).
create table if not exists public.sources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('telegram','rss','website','event_site')),
  config     jsonb not null default '{}',
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_logs (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid references public.sources(id) on delete set null,
  status      text not null,
  items_found int not null default 0,
  items_saved int not null default 0,
  message     text,
  created_at  timestamptz not null default now()
);

-- ── search_vector trigger ────────────────────────────────────────────────────
create or replace function public.promotions_set_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.location, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end $$;

drop trigger if exists promotions_search_vector on public.promotions;
create trigger promotions_search_vector
  before insert or update on public.promotions
  for each row execute function public.promotions_set_search_vector();

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

-- ── New-user → profile trigger ───────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.promotions       enable row level security;
alter table public.profiles          enable row level security;
alter table public.saved_promotions  enable row level security;
alter table public.sources           enable row level security;
alter table public.ingestion_logs    enable row level security;

-- Anyone (incl. anon) can read active promotions.
drop policy if exists "active promotions are public" on public.promotions;
create policy "active promotions are public"
  on public.promotions for select
  using (status = 'active');

-- Profiles: owner only.
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile upsert" on public.profiles;
create policy "own profile upsert"
  on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update using (auth.uid() = id);

-- Saved promotions: owner only, full CRUD.
drop policy if exists "own saved select" on public.saved_promotions;
create policy "own saved select"
  on public.saved_promotions for select using (auth.uid() = user_id);
drop policy if exists "own saved insert" on public.saved_promotions;
create policy "own saved insert"
  on public.saved_promotions for insert with check (auth.uid() = user_id);
drop policy if exists "own saved delete" on public.saved_promotions;
create policy "own saved delete"
  on public.saved_promotions for delete using (auth.uid() = user_id);

-- sources / ingestion_logs: no anon access (service role bypasses RLS).
-- (No policies → locked down by default.)

-- PromoSG: rich profiles (display name, avatar, bio) + a safe public view
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0009_profiles.sql

-- ── Profile columns ──────────────────────────────────────────────────────────
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url   text;
alter table public.profiles add column if not exists bio          text;
alter table public.profiles add column if not exists username     text;

-- Case-insensitive unique handle (nulls allowed → not everyone needs one).
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

-- Backfill a friendly display name from the email local-part.
update public.profiles
   set display_name = split_part(email, '@', 1)
 where display_name is null and email is not null;

-- Seed display_name for future signups.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

-- ── Public profile view ──────────────────────────────────────────────────────
-- profiles is owner-only (it holds emails). This security-definer view exposes
-- ONLY the non-sensitive, public-facing columns so feeds/leaderboards/friends
-- can show live names + avatars without leaking emails.
create or replace view public.public_profiles
  with (security_invoker = false) as
select id, display_name, avatar_url, bio, username
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ── Leaderboard view: join live profile name + avatar ────────────────────────
-- Drop first: adding avatar_url mid-list reorders columns, which CREATE OR
-- REPLACE VIEW forbids.
drop view if exists public.user_check_in_stats;
create view public.user_check_in_stats with (security_invoker = true) as
select
  c.user_id,
  coalesce(p.display_name, (array_agg(c.author_name order by c.created_at desc))[1]) as author_name,
  p.avatar_url,
  count(*)::int                                                                as check_ins,
  count(distinct lower(c.venue_name))::int                                     as venues,
  count(distinct ((c.created_at at time zone 'Asia/Singapore')::date))::int    as days,
  count(distinct lower(coalesce(nullif(c.area, ''), 'singapore')))::int        as areas,
  max(c.created_at)                                                            as last_at,
  (count(*) * 10
     + count(distinct lower(c.venue_name)) * 15
     + count(distinct ((c.created_at at time zone 'Asia/Singapore')::date)) * 5)::int as points
from public.check_ins c
left join public.public_profiles p on p.id = c.user_id
group by c.user_id, p.display_name, p.avatar_url;

grant select on public.user_check_in_stats to anon, authenticated;

-- ── Avatar storage bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read; owner-only writes scoped to a folder named after their uid.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

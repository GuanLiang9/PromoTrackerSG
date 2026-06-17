-- PromoSG: private-by-default check-ins.
-- A check-in is visible to: its owner, anyone if the owner's profile is public,
-- or an accepted friend of the owner. The global leaderboard stays global.
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0012_visibility.sql

-- ── Profile visibility flag (default private) ────────────────────────────────
alter table public.profiles add column if not exists is_public boolean not null default false;

-- Expose it on the safe public view (appended at the end → CREATE OR REPLACE ok).
create or replace view public.public_profiles
  with (security_invoker = false) as
select id, display_name, avatar_url, bio, username, is_public
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ── Visibility predicate (SECURITY DEFINER to avoid RLS-within-RLS) ───────────
-- Referencing profiles/friendships directly inside a check_ins policy would be
-- re-filtered by THEIR RLS (profiles is owner-only), so a public author would be
-- invisible. A definer function bypasses that and encapsulates the rule.
create or replace function public.can_view_check_in(author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = author
    or exists (select 1 from public.profiles p where p.id = author and p.is_public)
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = author)
          or (f.addressee_id = auth.uid() and f.requester_id = author))
    );
$$;

grant execute on function public.can_view_check_in(uuid) to anon, authenticated;

-- ── Replace the public-read policy with friend/public/self visibility ─────────
drop policy if exists "check_ins public read" on public.check_ins;
drop policy if exists "check_ins visible read" on public.check_ins;
create policy "check_ins visible read"
  on public.check_ins for select
  using (public.can_view_check_in(user_id));

-- ── Keep the leaderboard GLOBAL despite the restrictive check_ins RLS ─────────
-- security_invoker = false makes the view run with its (privileged) owner's
-- rights, so it aggregates everyone's counts. It exposes only non-sensitive
-- aggregates + the public display name/avatar — never where anyone checked in.
drop view if exists public.user_check_in_stats;
create view public.user_check_in_stats with (security_invoker = false) as
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
left join public.profiles p on p.id = c.user_id
group by c.user_id, p.display_name, p.avatar_url;

grant select on public.user_check_in_stats to anon, authenticated;

notify pgrst, 'reload schema';

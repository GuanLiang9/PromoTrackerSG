-- PromoSG: rewards leaderboard
-- A read-only aggregate VIEW over check_ins (no new table). Personal stats
-- (streak/points/badges) are computed in JS from the user's own rows; this view
-- backs only the public leaderboard. security_invoker = true makes it respect
-- check_ins' existing public-read RLS — so it exposes only non-sensitive counts
-- and the public author_name snapshot, never emails or private rows.
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0008_rewards.sql

create or replace view public.user_check_in_stats with (security_invoker = true) as
select
  user_id,
  (array_agg(author_name order by created_at desc))[1]                      as author_name,
  count(*)::int                                                             as check_ins,
  count(distinct lower(venue_name))::int                                    as venues,
  count(distinct ((created_at at time zone 'Asia/Singapore')::date))::int   as days,
  count(distinct lower(coalesce(nullif(area, ''), 'singapore')))::int       as areas,
  max(created_at)                                                           as last_at,
  (count(*) * 10
     + count(distinct lower(venue_name)) * 15
     + count(distinct ((created_at at time zone 'Asia/Singapore')::date)) * 5)::int as points
from public.check_ins
group by user_id;

grant select on public.user_check_in_stats to anon, authenticated;

-- Tell PostgREST to pick up the new view immediately.
notify pgrst, 'reload schema';

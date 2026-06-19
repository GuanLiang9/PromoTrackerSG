-- PromoSG: crowd-sourced community venues (Swarm-style autofill).
-- Every check-in already stores venue_name/cuisine/area/lat/lng. This exposes a
-- privacy-safe, GLOBAL aggregate of nearby venues for check-in autofill: venue
-- name + representative coords + dominant cuisine/area + check-in count, but
-- NEVER who/when/note/per-user rating. Identity stays private under the existing
-- can_view_check_in RLS (this function deliberately bypasses it, like the global
-- user_check_in_stats view, but only returns non-identifying venue aggregates).
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0013_community_venues.sql

create or replace function public.nearby_community_venues(
  in_lat double precision, in_lng double precision, radius_m integer default 250
)
returns table (
  name text, cuisine text, area text,
  lat double precision, lng double precision,
  distance_m integer, check_in_count integer, last_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with near as (              -- bounding-box prefilter, then haversine <= radius
    select
      venue_name, cuisine, area, latitude, longitude, created_at,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians(latitude - in_lat) / 2), 2) +
        cos(radians(in_lat)) * cos(radians(latitude)) *
        power(sin(radians(longitude - in_lng) / 2), 2)))) as d
    from public.check_ins
    where latitude  between in_lat - radius_m / 111000.0 and in_lat + radius_m / 111000.0
      and longitude between in_lng - radius_m / 111000.0 and in_lng + radius_m / 111000.0
  )
  select
    (array_agg(venue_name order by created_at desc))[1]                       as name,
    mode() within group (order by cuisine) filter (where cuisine is not null) as cuisine,
    mode() within group (order by area)    filter (where area    is not null) as area,
    avg(latitude)::double precision  as lat,
    avg(longitude)::double precision as lng,
    min(d)::int                      as distance_m,
    count(*)::int                    as check_in_count,
    max(created_at)                  as last_at
  from near
  where d <= radius_m
  group by lower(trim(venue_name))
  order by check_in_count desc, distance_m asc
  limit 20;
$$;

grant execute on function public.nearby_community_venues(double precision, double precision, integer)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Content taxonomy: distinguish real deals from food recommendations, news and
-- events so each surface shows only the right kind of content (no crossover).
--   promotion → an actual deal/offer with savings (1-for-1, % off, free, sale…)
--   food_spot → a food recommendation / place to eat (no specific deal)
--   event     → a festival, market, pop-up, fair, concert, expo (a happening)
--   news      → editorial: openings, launches, reviews, guides, closures
-- Run with: node scripts/run-sql.mjs supabase/migrations/0005_content_type.sql

alter table public.promotions
  add column if not exists content_type text not null default 'promotion';

create index if not exists promotions_content_type_idx
  on public.promotions (content_type, status);

-- ── Reclassify existing rows (priority order) ────────────────────────────────
-- Start clean: assume promotion, then re-tag the exceptions.
update public.promotions set content_type = 'promotion';

-- 1. Food recommendations — the curated hidden-gem food spots (no deal).
update public.promotions set content_type = 'food_spot'
where 'west-sg-food' = any(tags);

-- 2. Events / happenings — the events category, or festival/market/pop-up words.
update public.promotions set content_type = 'event'
where content_type = 'promotion'
  and (
    category = 'events'
    or title ~* '\y(festival|fiesta|carnival|bazaar|pop-?up|pasar malam|night market|expo|funfair|countdown|parade|street fair)\y'
  );

-- 3. News / editorial — openings, launches, reviews, guides, roundups, closures
--    BUT only when there's no explicit deal language (those stay promotions).
update public.promotions set content_type = 'news'
where content_type = 'promotion'
  and (
       title ~* '\y(opens?|opening|now open|reopens?|launch(es|ed|ing)?|unveil(s|ed)?|introduc(e|es|ed|ing)|debuts?|arrives?|closing|closes?|permanently close|shuts? down)\y'
    or title ~* '\y(review|guide|directory|itinerary|michelin|recommendation)\y'
    or title ~* '(\y\d+\s+(best|fresh|new|top|must)\b|\ytop\s+\d+\b|\bbest\b.*\bin singapore\b|\bwhere to\b|\bhow to\b)'
    or title ~* '\y\d+\s+[\w-]+\s+(spots|places|cafes|cafés|restaurants|stalls|eateries|bars|bakeries|hawkers?|joints)\b'
    or title ~* '^\s*(\[new\]|\[new post\]|new post|\[foodiehypenow|pinned)'
    or title ~* '\y(do you need|what.?s happening|never go hungry)\y'
  )
  and title !~* '\y(\d+\s*-?\s*for\s*-?\s*\d+|1-?for-?1|\d+\s*%\s*off|%\s*off|free\b|giving away|sale\b|discount|voucher|cashback|rebate|\bdeal\b|\bpromo\b|save\s+\$|bundle|clearance|mid-?year sale)\y';

-- 4. Editorial sources (food blogs / review channels) post mostly reviews,
--    features and roundups — default them to news UNLESS there's a real deal.
update public.promotions set content_type = 'news'
where content_type = 'promotion'
  and source_name in (
    'Daniel Food Diary','Eatbook','Eatbook SG','Seth Lui','Miss Tam Chiak',
    'SG Food Lover','SG Foodies','The Honeycombers SG','The Smart Local'
  )
  and title !~* '\y(\d+\s*-?\s*for\s*-?\s*\d+|1-?for-?1|\d+\s*%\s*off|%\s*off|free\b|giving away|sale\b|discount|voucher|cashback|rebate|\bdeal\b|\bpromo\b|save\s+\$|bundle|clearance|mid-?year sale)\y';

-- Everything else remains 'promotion' (real deals + ambiguous offers).

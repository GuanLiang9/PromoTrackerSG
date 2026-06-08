-- Track the source message id (e.g. telegram:<channel>/<id>) so re-runs can
-- skip already-seen posts BEFORE calling the LLM — keeps AI usage minimal.
alter table public.promotions
  add column if not exists external_id text;

create index if not exists promotions_external_id_idx
  on public.promotions (external_id)
  where external_id is not null;

-- Backfill external_id for rows ingested before this column existed, by
-- reconstructing it from the stored source_url (no AI / re-fetch needed).
-- TelegramAdapter: externalId = 'telegram:<channel>/<id>', source_url = 'https://t.me/<channel>/<id>'.
update public.promotions
set external_id = 'telegram:' || replace(source_url, 'https://t.me/', '')
where external_id is null
  and 'ingested' = any(tags)
  and source_url like 'https://t.me/%';

-- RssAdapter: externalId = 'rss:<link>', source_url = <link>.
update public.promotions
set external_id = 'rss:' || source_url
where external_id is null
  and 'ingested' = any(tags)
  and source_url is not null
  and source_url like 'http%'
  and source_url not like 'https://t.me/%';

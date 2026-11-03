-- Public bucket for permanent copies of promo post photos (Telegram CDN links expire).
-- Reads are public via the bucket's public URL; writes happen only with the service-role key.
insert into storage.buckets (id, name, public)
values ('promo-images', 'promo-images', true)
on conflict (id) do update set public = true;

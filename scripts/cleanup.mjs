import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const del = await c.query(
  `delete from public.promotions
   where 'ingested' = any(tags) and title ~* '^\\s*https?://'`,
);
const upd = await c.query(
  `update public.promotions
   set title = btrim(regexp_replace(title, 'https?://\\S+', '', 'g'))
   where 'ingested' = any(tags) and title ~* 'https?://'`,
);
// Telegram service messages / non-promo noise.
const junk = await c.query(
  `delete from public.promotions
   where 'ingested' = any(tags)
     and (title ilike 'channel created%' or title ilike 'channel photo%'
          or title ilike 'channel name%' or char_length(title) < 10)`,
);
console.log(`Deleted URL-only titles: ${del.rowCount}`);
console.log(`Stripped trailing URLs: ${upd.rowCount}`);
console.log(`Deleted service-message junk: ${junk.rowCount}`);
await c.end();

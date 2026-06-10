// Archive all ingested promos with a default 30-day window.
// These are Telegram/RSS posts that had no explicit date — the extractor
// defaulted end_date to ingestion_date + 30 days. Since we can't verify
// they're still valid, archiving is safer than showing potentially stale deals.
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(`
  update public.promotions
  set status = 'archived'
  where status = 'active'
    and 'ingested' = any(tags)
    and (end_date::date - created_at::date) between 5 and 35
  returning id, title, source_name
`);
console.log(`Archived ${rows.length} stale ingested promos (default window):`);
rows.forEach(r => console.log(`  ${(r.title||'').slice(0,60)}  [${r.source_name||''}]`));
const { rows: totals } = await c.query(
  `select status, count(*)::int n from public.promotions group by status order by n desc`
);
console.log('\nDB totals:', JSON.stringify(totals));
await c.end();

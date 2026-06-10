// Diagnose stale/2025-sourced ingested promos still marked active.
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

// Promos that were ingested with a DEFAULT 30-day window
// (end_date is roughly created_at + 30 days, meaning no explicit date was parsed).
const { rows: defaultWindow } = await c.query(`
  select id, title, created_at::date, end_date::date,
    (end_date::date - created_at::date) as days_window,
    source_name, source_url
  from public.promotions
  where status = 'active'
    and 'ingested' = any(tags)
    and (end_date::date - created_at::date) between 25 and 35
  order by created_at desc
  limit 40
`);
console.log(`\nIngested with ~30-day default window (no explicit date): ${defaultWindow.length}`);
defaultWindow.forEach(r =>
  console.log(`  ${r.created_at} → ${r.end_date} [${r.days_window}d]  ${(r.title||'').slice(0,55)}  [${r.source_name||''}]`)
);

// Any Telegram promos from source_url containing old message IDs (low numbers)
const { rows: totals } = await c.query(`
  select
    count(*) filter (where 'ingested' = any(tags) and status='active')::int active_ingested,
    count(*) filter (where 'ingested' = any(tags) and status='active' and
      (end_date::date - created_at::date) between 25 and 35)::int default_window,
    count(*) filter (where 'ingested' = any(tags) and status='active' and
      (end_date::date - created_at::date) not between 25 and 35)::int explicit_date
  from public.promotions
`);
console.log('\nTotals for active ingested:', totals[0]);
await c.end();

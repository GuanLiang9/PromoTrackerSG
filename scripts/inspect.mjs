import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(
  `select title, category, start_date, end_date, source_name, location
   from public.promotions where 'ingested' = any(tags)
   order by created_at desc limit 18`,
);
for (const r of rows) {
  console.log(`[${r.category}] ${r.title}`);
  console.log(`   ${r.start_date?.toISOString?.().slice(0,10) ?? r.start_date} → ${r.end_date?.toISOString?.().slice(0,10) ?? r.end_date} | ${r.source_name} | ${r.location ?? "-"}`);
}
const { rows: counts } = await c.query(
  `select count(*)::int total,
     count(*) filter (where 'ingested' = any(tags))::int ingested
   from public.promotions`,
);
console.log("\nTotals:", counts[0]);
await c.end();

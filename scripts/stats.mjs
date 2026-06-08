import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const t = await c.query(
  `select count(*)::int total,
     count(*) filter (where 'ingested' = any(tags))::int ingested,
     count(*) filter (where status='active')::int active
   from public.promotions`,
);
console.log("Totals:", t.rows[0]);
const cat = await c.query(
  `select category, count(*)::int n from public.promotions
   where status='active' group by category order by n desc`,
);
console.log("\nBy category:");
cat.rows.forEach((r) => console.log(`  ${r.category}: ${r.n}`));
const src = await c.query(
  `select source_name, count(*)::int n from public.promotions
   where 'ingested' = any(tags) group by source_name order by n desc`,
);
console.log("\nBy source:");
src.rows.forEach((r) => console.log(`  ${r.source_name ?? "-"}: ${r.n}`));
await c.end();

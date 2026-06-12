import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows: counts } = await c.query(`
  select content_type, count(*)::int n
  from public.promotions where status='active'
  group by content_type order by n desc`);
console.log("Active by content_type:", JSON.stringify(counts));

for (const ct of ["promotion", "event", "news", "food_spot"]) {
  const { rows } = await c.query(
    `select title, source_name from public.promotions
     where status='active' and content_type=$1 order by random() limit 8`, [ct]);
  console.log(`\n── ${ct.toUpperCase()} (sample) ──`);
  rows.forEach(r => console.log(`  [${r.source_name}] ${(r.title||'').slice(0,62)}`));
}
await c.end();

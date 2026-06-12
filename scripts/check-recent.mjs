import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(`
  select content_type, title, source_name
  from public.promotions
  where 'ingested' = any(tags)
  order by updated_at desc limit 15`);
rows.forEach(r => console.log(`  [${r.content_type}] ${(r.title||'').slice(0,58)} (${r.source_name})`));
const { rows: dist } = await c.query(`
  select content_type, count(*)::int n from public.promotions
  where status='active' group by content_type order by n desc`);
console.log("\nActive distribution:", JSON.stringify(dist));
await c.end();

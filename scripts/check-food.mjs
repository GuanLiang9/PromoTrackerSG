import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(`
  select title, source_name from public.promotions
  where status='active' and content_type='promotion' and 'ingested'=any(tags)
    and (source_name in ('GoodLobang','SG Food Deals')
         or title ~* 'mcdonald|kfc|texas|pizza|burger|jollibee|subway|popeye|chicken|1-for-1|1 for 1|hawker|cafe|café')
  order by updated_at desc limit 30`);
console.log(`Food / fast-food promos now live (${rows.length}):`);
rows.forEach(r => console.log(`  [${r.source_name}] ${(r.title||'').slice(0,62)}`));
const { rows: dist } = await c.query(
  `select content_type, count(*)::int n from public.promotions where status='active' group by content_type order by n desc`);
console.log("\nActive distribution:", JSON.stringify(dist));
const { rows: src } = await c.query(
  `select source_name, count(*)::int n from public.promotions where status='active' and content_type='promotion' group by source_name order by n desc limit 12`);
console.log("Top promo sources:");
src.forEach(r => console.log(`  ${r.source_name}: ${r.n}`));
await c.end();

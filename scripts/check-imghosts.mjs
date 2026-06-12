import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(`
  select
    case
      when image_url is null or image_url='' then '(none)'
      else split_part(split_part(image_url,'//',2),'/',1)
    end as host,
    count(*)::int n
  from public.promotions where status='active'
  group by host order by n desc`);
console.log("Active promo image hosts:");
rows.forEach(r => console.log(`  ${r.host}: ${r.n}`));
// sample a few telegram ones
const { rows: tg } = await c.query(`
  select title, image_url from public.promotions
  where status='active' and image_url ~* 'telegram|cdn-telegram|t.me'
  limit 5`);
console.log("\nSample telegram image URLs:");
tg.forEach(r => console.log(`  ${(r.title||'').slice(0,30)} -> ${r.image_url}`));
await c.end();

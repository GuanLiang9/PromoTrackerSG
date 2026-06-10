import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const today = "2026-06-10";
const { rows: byStatus } = await c.query(
  "select status, count(*)::int n from public.promotions group by status order by n desc"
);
console.log("By status:", JSON.stringify(byStatus));
const { rows: expired } = await c.query(
  `select count(*)::int n from public.promotions where status='active' and end_date < $1`, [today]
);
console.log("Expired but still active:", expired[0].n);
const { rows: samples } = await c.query(
  `select title, end_date::text, source_name from public.promotions
   where status='active' and end_date < $1
   order by end_date desc limit 15`, [today]
);
samples.forEach(r => console.log(` - ${r.end_date}  ${(r.title||"").slice(0,55)}  [${r.source_name||"seed"}]`));
await c.end();

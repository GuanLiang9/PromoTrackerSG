import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(
  `select
     count(*) filter (where 'ingested' = any(tags))::int ingested,
     count(*) filter (where 'ingested' = any(tags) and external_id is not null)::int tagged,
     count(*) filter (where 'ingested' = any(tags) and external_id is null)::int untagged
   from public.promotions`,
);
console.log("Ingested rows:", r.rows[0]);
const sample = await c.query(
  `select external_id from public.promotions
   where external_id is not null order by random() limit 5`,
);
console.log("Sample external_ids:");
sample.rows.forEach((x) => console.log("  " + x.external_id));
await c.end();

// Diagnostic: understand the date distribution of active promotions.
// Run: node --env-file=.env.local scripts/audit-dates.mjs
import { Client } from "pg";

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const today = new Date().toISOString().slice(0, 10);
console.log("Today:", today, "\n");

const { rows: status } = await c.query(
  `select status, count(*)::int n from public.promotions group by status order by n desc`,
);
console.log("By status:", status);

const { rows: active } = await c.query(
  `select count(*)::int total,
     count(*) filter (where end_date < current_date)::int ended_past,
     count(*) filter (where start_date > current_date)::int starts_future,
     count(*) filter (where end_date >= current_date and start_date <= current_date)::int running_now,
     count(*) filter (where created_at < current_date - interval '90 days')::int created_90d_ago,
     min(created_at)::date oldest_created,
     max(created_at)::date newest_created
   from public.promotions where status = 'active'`,
);
console.log("\nActive promotions breakdown:", active[0]);

// Distribution of end_date by month for active rows
const { rows: byMonth } = await c.query(
  `select to_char(end_date, 'YYYY-MM') ym, count(*)::int n
   from public.promotions where status = 'active'
   group by ym order by ym`,
);
console.log("\nActive end_date by month:");
for (const r of byMonth) console.log(`  ${r.ym}: ${r.n}`);

// Suspicious: created long ago but end_date synthesized into the future
const { rows: suspicious } = await c.query(
  `select count(*)::int n
   from public.promotions
   where status = 'active'
     and created_at < current_date - interval '45 days'
     and end_date >= current_date`,
);
console.log("\nSuspicious (created >45d ago but still 'active' with future end_date):", suspicious[0].n);

const { rows: samples } = await c.query(
  `select title, start_date::date sd, end_date::date ed, created_at::date cd, source_name
   from public.promotions
   where status = 'active'
     and created_at < current_date - interval '45 days'
     and end_date >= current_date
   order by created_at asc limit 15`,
);
console.log("\nSample suspicious rows:");
for (const r of samples) {
  console.log(`  "${r.title?.slice(0, 60)}"`);
  console.log(`     start=${r.sd} end=${r.ed} created=${r.cd} src=${r.source_name}`);
}

await c.end();

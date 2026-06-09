// Diagnostic: find active promos whose TEXT references past years or stale phrasing.
// Run: node --env-file=.env.local scripts/audit-content.mjs
import { Client } from "pg";

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const { rows } = await c.query(
  `select id, title, description, start_date::date sd, end_date::date ed, source_name, source_url
   from public.promotions where status = 'active'
   order by created_at asc`,
);

// Patterns that signal a stale/expired promo in the text.
const pastYears = /\b(2019|2020|2021|2022|2023|2024|2025)\b/;
// Month-year like "Dec 2024", "31 December 2024"
const staleNeedles = [
  pastYears,
];

const flagged = [];
for (const r of rows) {
  const text = `${r.title}\n${r.description ?? ""}`;
  const hits = [];
  const ym = text.match(pastYears);
  if (ym) hits.push(`year:${ym[0]}`);
  if (hits.length) flagged.push({ ...r, hits });
}

console.log(`Total active: ${rows.length}`);
console.log(`Flagged (text references past year 2019–2025): ${flagged.length}\n`);

for (const r of flagged) {
  console.log(`[${r.hits.join(",")}] ${r.title?.slice(0, 70)}`);
  console.log(`   ${r.sd}→${r.ed} | ${r.source_name}`);
  const snippet = (r.description ?? "").replace(/\s+/g, " ").slice(0, 140);
  if (snippet) console.log(`   "${snippet}"`);
  console.log(`   id=${r.id}`);
}

// Also list ALL active titles so we can eyeball obviously-dated campaigns
console.log("\n\n=== ALL ACTIVE TITLES ===");
for (const r of rows) {
  console.log(`- ${r.title?.slice(0, 80)}  [${r.source_name}] ${r.sd}→${r.ed}`);
}

await c.end();

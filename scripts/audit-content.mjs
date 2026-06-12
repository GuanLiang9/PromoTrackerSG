// Audit current active promotions — identify news vs real deals vs editorial.
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows } = await c.query(`
  select id, title, source_name, tags, start_date::text, end_date::text,
    (end_date::date - start_date::date) as span_days
  from public.promotions
  where status = 'active'
  order by source_name, title
`);

// Heuristic patterns that indicate editorial/news vs real deals
const NEWS_PATTERNS = [
  /\bopens?\b/i, /\bopening\b/i, /\bnow open\b/i, /\blaunche[sd]\b/i,
  /\bunveil[sd]?\b/i, /\bintroduce[sd]?\b/i, /\bnew store\b/i,
  /\barrives?\b/i, /\bbring[s]?\b.*\bto singapore\b/i,
  /^🏷/, // Seth Lui review posts start with 🏷
  /\breview\b/i, /\bbest\b.*\bin singapore\b/i,
  /\bguide\b/i, /\bwhere to\b/i, /\bhow to\b/i,
  /\bitinerary\b/i, /\bdo you need\b/i, /\bwhat.s happening\b/i,
  /\binterior designer\b/i, /\btravel money\b/i,
];

const DEAL_PATTERNS = [
  /\d+\s*(?:for|%-?)\s*\d/i, /\bfree\b/i, /\b\d+\s*%\s*off\b/i,
  /\b1-?for-?1\b/i, /\bdiscount\b/i, /\bpromo\b/i, /\bsale\b/i,
  /\bvoucher\b/i, /\bcashback\b/i, /\brebate\b/i, /\bdeal\b/i,
  /\bsave\b/i, /\bhalf.?price\b/i, /\boff\b/i, /\bspecial\b.*\bprice\b/i,
];

const EDITORIAL_SOURCES = ['Seth Lui','Daniel Food Diary','SG Foodies','MoneySmart','The Smart Local','The Honeycombers SG','Eatbook','Miss Tam Chiak'];

const news = [], deals = [], unsure = [];
for (const r of rows) {
  const isNewsy = NEWS_PATTERNS.some(p => p.test(r.title));
  const isDeal = DEAL_PATTERNS.some(p => p.test(r.title));
  const isEditorial = EDITORIAL_SOURCES.includes(r.source_name) && !isDeal;
  if (isNewsy || isEditorial) news.push(r);
  else if (isDeal) deals.push(r);
  else unsure.push(r);
}

console.log(`\nTotal active: ${rows.length}`);
console.log(`\n== REAL DEALS (${deals.length}) ==`);
deals.slice(0,20).forEach(r => console.log(`  [${r.source_name}] ${(r.title||'').slice(0,65)}`));

console.log(`\n== NEWS/EDITORIAL (${news.length}) — should be archived ==`);
news.forEach(r => console.log(`  [${r.source_name}] ${(r.title||'').slice(0,65)}`));

console.log(`\n== UNSURE (${unsure.length}) ==`);
unsure.forEach(r => console.log(`  [${r.source_name}] ${(r.title||'').slice(0,65)}`));

await c.end();

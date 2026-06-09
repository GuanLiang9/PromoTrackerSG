// Curate active promotions: archive ones that are expired-by-text or not
// actually promotions (no offer signal). Dry-run by default.
//   Preview:  node --env-file=.env.local scripts/curate.mjs
//   Apply:    node --env-file=.env.local scripts/curate.mjs --apply
import { Client } from "pg";

const APPLY = process.argv.includes("--apply");
const today = new Date().toISOString().slice(0, 10);
const refYear = Number(today.slice(0, 4));

// ── Validity parser (mirror of lib/ingestion/parse-validity.ts) ──────────────
const MONTHS = { jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12 };
const ALT = Object.keys(MONTHS).join("|");
const DMY = new RegExp(`\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(${ALT})\\b\\.?\\s*(\\d{4})?`, "gi");
const MDY = new RegExp(`\\b(${ALT})\\b\\.?\\s+(\\d{1,2})\\s*(?:st|nd|rd|th)?,?\\s*(\\d{4})?`, "gi");
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const SLASH = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const CUE = /\b(?:till|until|til|thru|through|ends?|ending|expires?|valid(?:ity)?(?:\s*:?\s*now)?(?:\s*[-–—to]+)?|up\s*to|by)\b[\s:.–—-]*$/i;
const isoDate = (y,m,d) => (m<1||m>12||d<1||d>31) ? null : `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

// Returns { latest, cueEnd } — cueEnd is the earliest deadline tied to a
// validity cue word; authoritative for expiry.
function parseDates(text) {
  const all = [], cues = [];
  const push = (y,m,d,idx) => {
    const v = isoDate(y ?? refYear, m, d);
    if (!v) return;
    all.push(v);
    if (CUE.test(text.slice(Math.max(0, idx-24), idx))) cues.push(v);
  };
  let mm;
  DMY.lastIndex=0; while ((mm=DMY.exec(text))) push(mm[3]?+mm[3]:undefined, MONTHS[mm[2].toLowerCase()], +mm[1], mm.index);
  MDY.lastIndex=0; while ((mm=MDY.exec(text))) push(mm[3]?+mm[3]:undefined, MONTHS[mm[1].toLowerCase()], +mm[2], mm.index);
  ISO.lastIndex=0; while ((mm=ISO.exec(text))) push(+mm[1], +mm[2], +mm[3], mm.index);
  SLASH.lastIndex=0; while ((mm=SLASH.exec(text))) push(+mm[3], +mm[2], +mm[1], mm.index);
  all.sort(); cues.sort();
  return { latest: all.length ? all[all.length-1] : null, cueEnd: cues.length ? cues[0] : null };
}

// ── Offer-signal detector ────────────────────────────────────────────────────
const OFFER = [
  /\d{1,3}\s*%/,                       // 50%
  /\$\s*\d/,                           // $5
  /\bsgd\b/i,
  /\bfree\b/i,
  /\b\d\s*[- ]?for[- ]?\s*\d\b/i,      // 1-for-1, 2 for 1
  /\bbuy\s*\d?[^.]*\bget\b/i,          // buy X get Y
  /\b(deal|sale|promo|discount|voucher|rebate|cashback|bundle|clearance|giveaway|bogo|offer|off|special|bonus|waiver|sale)\b/i,
];
const hasOffer = (text) => OFFER.some((re) => re.test(text));

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(
  `select id, title, description, start_date::date sd, end_date::date ed, source_name, tags
   from public.promotions where status='active' order by source_name, created_at`,
);

const expired = [], nonPromo = [], keep = [];
for (const r of rows) {
  const text = `${r.title}\n${r.description ?? ""}`;
  const ingested = Array.isArray(r.tags) && r.tags.includes("ingested");
  const { latest, cueEnd } = parseDates(text);
  const deadline = cueEnd ?? latest;
  const expiredByDate = cueEnd != null ? cueEnd < today : (latest != null && latest < today);

  if (expiredByDate) {
    expired.push({ ...r, reason: `validity ${deadline} < ${today}` });
  } else if (ingested && !hasOffer(text)) {
    nonPromo.push({ ...r, reason: "no offer signal (article/spam/review)" });
  } else {
    keep.push(r);
  }
}

const short = (s, n=66) => (s ?? "").replace(/\s+/g," ").slice(0,n);
console.log(`Today: ${today}  |  Active rows: ${rows.length}\n`);
console.log(`EXPIRED (archive): ${expired.length}`);
for (const r of expired) console.log(`  ✗ ${short(r.title)}  [${r.source_name}] — ${r.reason}`);
console.log(`\nNON-PROMO (archive, ingested only): ${nonPromo.length}`);
for (const r of nonPromo) console.log(`  ✗ ${short(r.title)}  [${r.source_name}]`);
console.log(`\nKEEP (active): ${keep.length}`);
for (const r of keep) console.log(`  ✓ ${short(r.title)}  [${r.source_name}]`);

if (APPLY) {
  const ids = [...expired, ...nonPromo].map((r) => r.id);
  if (ids.length) {
    const { rowCount } = await c.query(
      `update public.promotions
         set status='archived',
             tags = (select array_agg(distinct t) from unnest(coalesce(tags,'{}') || array['auto-archived']) t)
       where id = any($1::uuid[])`,
      [ids],
    );
    console.log(`\n✓ Archived ${rowCount} rows.`);
  } else {
    console.log("\nNothing to archive.");
  }
} else {
  console.log(`\n(DRY RUN — re-run with --apply to archive ${expired.length + nonPromo.length} rows)`);
}
await c.end();

// Teach the image resolver a correction. Persists a keyword → image override
// AND immediately re-images every existing active promo that matches, so the fix
// is visible right away. Future ingested promos pick it up via the cron route.
//
// Usage:
//   SUPABASE_DB_URL=... node scripts/set-image-override.mjs "<keyword>" "<unsplash-id|full-url>" ["note"]
// Examples:
//   node scripts/set-image-override.mjs "mcdonald" "1606131731446-5568d87113aa"
//   node scripts/set-image-override.mjs "kopi" "https://images.unsplash.com/photo-xxxx?w=800"
import { Client } from "pg";

const [, , keywordArg, imageArg, note] = process.argv;
if (!keywordArg || !imageArg) {
  console.error('Usage: node scripts/set-image-override.mjs "<keyword>" "<unsplash-id|full-url>" ["note"]');
  process.exit(1);
}

const keyword = keywordArg.toLowerCase().trim();
// Accept a bare Unsplash photo id or a full URL.
const imageUrl = /^https?:\/\//.test(imageArg)
  ? imageArg
  : `https://images.unsplash.com/photo-${imageArg}?w=800&q=80&auto=format&fit=crop`;

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

await c.query(
  `insert into public.image_overrides (keyword, image_url, note)
   values ($1, $2, $3)
   on conflict (keyword) do update set image_url = excluded.image_url, note = excluded.note`,
  [keyword, imageUrl, note ?? null],
);
console.log(`Override saved: "${keyword}" → ${imageUrl}`);

// Apply immediately to existing active promos that mention the keyword.
const { rowCount } = await c.query(
  `update public.promotions
      set image_url = $1
    where status = 'active'
      and (lower(title) like '%' || $2 || '%' or lower(coalesce(description,'')) like '%' || $2 || '%')`,
  [imageUrl, keyword],
);
console.log(`Re-imaged ${rowCount} existing active promo(s) matching "${keyword}".`);
await c.end();

// Runs one or more .sql files against SUPABASE_DB_URL.
// Usage: node scripts/run-sql.mjs supabase/migrations/0001_init.sql supabase/seed.sql
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("No SQL files passed");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected to", new URL(url).host);
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    console.log(`\n── Running ${file} (${sql.length} bytes) ──`);
    await client.query(sql);
    console.log(`✓ ${file} applied`);
  }
  const { rows } = await client.query(
    "select count(*)::int as n from public.promotions",
  );
  console.log(`\nPromotions in DB: ${rows[0].n}`);
} catch (err) {
  console.error("ERROR:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

// Re-audit active promo dates with the free OpenRouter model and archive stale
// ones. Fixes inflated/multi-day dates so single-day posts ("On June 14") are
// only live that day. Safe to run repeatedly (used by the daily GitHub Action).
//
// Run: node --env-file=.env.local scripts/reaudit-dates.mjs [maxItems]
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY = process.env.OPENROUTER_API_KEY || process.env.API_KEY_OPENROUTER || "";
const MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const LIMIT = Number(process.argv[2] || process.env.REAUDIT_MAX || 0) || Infinity;
if (!URL || !SVC) { console.error("Missing Supabase env"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM =
  `You extract the validity dates of a Singapore promotion/event. Today is ${today}. ` +
  "Return ONLY JSON: {\"startDate\": \"YYYY-MM-DD\"|null, \"endDate\": \"YYYY-MM-DD\"|null}. " +
  "Resolve relative dates against today; assume the current year if omitted. " +
  "SINGLE-DAY RULE: if it runs on one day ('on June 14', '14 Jun only', 'this Saturday', " +
  "'today only'), set startDate AND endDate to that same date. Only return an endDate later " +
  "than startDate when the text explicitly states a multi-day range ('1-14 June', 'until 30 " +
  "June'). Never invent a multi-day window. If no date is stated, return both null.";

function parseJsonLoose(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const c = fenced ? fenced[1] : raw;
  const a = c.indexOf("{"), b = c.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(c.slice(a, b + 1)); } catch { return null; }
}
const iso = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

async function extractDates(text) {
  if (!KEY) return null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE,
        "X-Title": "PromoSG Reaudit",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text.slice(0, 3000) },
        ],
      }),
    });
    if (res.status === 429 || res.status >= 500) { await sleep(1500 * attempt); continue; }
    if (!res.ok) return null;
    let data;
    try {
      const raw = await res.text();
      if (!raw.trim()) { await sleep(1500 * attempt); continue; } // empty body → retry
      data = JSON.parse(raw);
    } catch {
      return null; // unparseable provider response → skip this promo
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const j = parseJsonLoose(content);
    return j ? { start: iso(j.startDate), end: iso(j.endDate) } : null;
  }
  return null;
}

const { data: promos, error } = await admin
  .from("promotions")
  .select("id, title, description, terms, start_date, end_date")
  .eq("status", "active")
  .in("content_type", ["promotion", "event"])
  .order("created_at", { ascending: true });
if (error) { console.error(error.message); process.exit(1); }

let scanned = 0, updated = 0, archived = 0, skipped = 0;
const batch = promos.slice(0, LIMIT === Infinity ? promos.length : LIMIT);
console.log(`Re-auditing ${batch.length}/${promos.length} active promos (today=${today})…`);

for (const p of batch) {
  scanned++;
  try {
    const text = [p.title, p.description, p.terms].filter(Boolean).join("\n").trim();
    const dates = await extractDates(text);
    await sleep(350); // be gentle on the free model
    if (!dates || (!dates.start && !dates.end)) { skipped++; continue; }

    let start = dates.start ?? p.start_date;
    let end = dates.end ?? dates.start ?? p.end_date; // single-day fallback
    if (end < start) end = start;

    if (end < today) {
      await admin.from("promotions").update({ status: "archived", start_date: start, end_date: end }).eq("id", p.id);
      archived++;
      console.log(`  archived  ${p.end_date}→${end}  ${p.title.slice(0, 60)}`);
    } else if (start !== p.start_date || end !== p.end_date) {
      await admin.from("promotions").update({ start_date: start, end_date: end }).eq("id", p.id);
      updated++;
      console.log(`  fixed     ${p.start_date}..${p.end_date} → ${start}..${end}  ${p.title.slice(0, 50)}`);
    }
  } catch (e) {
    skipped++;
    console.log(`  skip(err) ${p.title.slice(0, 50)} — ${e.message}`);
  }
}

// Safety net: archive anything whose end_date is already in the past.
const { data: swept } = await admin
  .from("promotions").update({ status: "archived" })
  .lt("end_date", today).eq("status", "active").select("id");
const sweptN = swept?.length ?? 0;

console.log(`\nDone. scanned=${scanned} fixed=${updated} archived=${archived} skipped=${skipped} swept=${sweptN}`);

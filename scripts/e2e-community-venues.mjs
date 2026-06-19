// E2E for crowd-sourced community venues (migration 0013). Verifies the
// nearby_community_venues RPC aggregates check-ins GLOBALLY (even a private
// user's) for autofill, while exposing only non-identifying venue data.
// Run: node --env-file=.env.local scripts/e2e-community-venues.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("Missing env"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const ts = Date.now();
const emailA = `e2e-cv-a-${ts}@example.com`;
const emailB = `e2e-cv-b-${ts}@example.com`;

// A quiet patch of Singapore unlikely to collide with seeded check-ins.
const LAT = 1.3041 + Math.random() * 0.0005;
const LNG = 103.8312 + Math.random() * 0.0005;
const VENUE = `E2E Kopitiam ${ts}`;

let failures = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗ FAIL"} ${m}`); if (!c) failures++; };
async function signed(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

const ids = [];
const checkInIds = [];
try {
  for (const e of [emailA, emailB]) {
    const { data, error } = await admin.auth.admin.createUser({ email: e, password: pass, email_confirm: true });
    if (error) throw new Error(error.message);
    ids.push(data.user.id);
  }
  const [uidA, uidB] = ids;
  // A stays PRIVATE (default). B is irrelevant to visibility here.
  const A = await signed(emailA);
  const B = await signed(emailB);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // Both users check in at the same venue/coord; same name, same cuisine/area.
  for (const [client, uid, name] of [[A, uidA, "Tester A"], [B, uidB, "Tester B"]]) {
    const { data, error } = await client.from("check_ins").insert({
      user_id: uid, author_name: name, venue_name: VENUE,
      note: "secret note", rating: 5, cuisine: "chinese", area: "Tiong Bahru",
      latitude: LAT, longitude: LNG,
    }).select("id").single();
    if (error) throw new Error(`insert ${name}: ${error.message}`);
    checkInIds.push(data.id);
  }

  // Sanity: A is private, so anon cannot see A's actual check-in row (RLS holds).
  {
    const { data } = await anon.from("check_ins").select("id").eq("id", checkInIds[0]).maybeSingle();
    ok(!data, "private user's raw check-in row stays hidden from anon (RLS intact)");
  }

  // The community RPC aggregates BOTH check-ins (global, identity-hidden).
  {
    const { data, error } = await anon.rpc("nearby_community_venues", {
      in_lat: LAT, in_lng: LNG, radius_m: 250,
    });
    ok(!error, `RPC callable by anon ${error ? "→ " + error.message : ""}`);
    const row = (data ?? []).find((r) => r.name === VENUE);
    ok(!!row, "community venue surfaces from check-ins");
    ok(row?.check_in_count === 2, `aggregates both users' check-ins (count=${row?.check_in_count})`);
    ok(row?.cuisine === "chinese", `dominant cuisine correct (${row?.cuisine})`);
    ok(row?.area === "Tiong Bahru", `dominant area correct (${row?.area})`);
    ok(typeof row?.distance_m === "number" && row.distance_m <= 250, `distance within radius (${row?.distance_m}m)`);
    // Identity-hidden: no personal columns leak.
    const cols = row ? Object.keys(row) : [];
    ok(!cols.includes("user_id") && !cols.includes("note") && !cols.includes("author_name"),
      `exposes no identity/personal columns (${cols.join(",")})`);
  }

  // A far-away coordinate must not return this venue.
  {
    const { data } = await anon.rpc("nearby_community_venues", {
      in_lat: LAT + 0.05, in_lng: LNG + 0.05, radius_m: 250,
    });
    ok(!(data ?? []).some((r) => r.name === VENUE), "venue absent for a far-away location");
  }
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  for (const id of checkInIds) { try { await admin.from("check_ins").delete().eq("id", id); } catch {} }
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}

// End-to-end test for the check-ins (Community Spots) feature.
// Exercises the exact RLS paths the server actions rely on.
// Run: node --env-file=.env.local scripts/e2e-checkins.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("Missing env"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const ts = Date.now();
const emailA = `e2e-a-${ts}@example.com`;
const emailB = `e2e-b-${ts}@example.com`;

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗ FAIL"} ${msg}`); if (!cond) failures++; };

async function signedClient(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

const createdUserIds = [];
let insertedId = null;
try {
  // ── Setup: two confirmed users ──
  for (const email of [emailA, emailB]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    createdUserIds.push(data.user.id);
  }
  const [uidA] = createdUserIds;
  const A = await signedClient(emailA);
  const B = await signedClient(emailB);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // ── 1. Owner insert (valid) ──
  {
    const { data, error } = await A.from("check_ins").insert({
      user_id: uidA, author_name: "Tester A", venue_name: "E2E Ramen Bar",
      note: "Great tonkotsu", rating: 5, cuisine: "japanese", area: "Tampines",
      latitude: 1.3536, longitude: 103.9450,
    }).select("id").single();
    ok(!error && data?.id, `owner can insert own check-in ${error ? "→ " + error.message : ""}`);
    insertedId = data?.id ?? null;
  }

  // ── 2. RLS WITH CHECK: cannot insert as someone else ──
  {
    const { error } = await B.from("check_ins").insert({
      user_id: uidA, author_name: "Imposter", venue_name: "Spoofed",
      latitude: 1.30, longitude: 103.85,
    });
    ok(!!error, "RLS blocks insert with a forged user_id (WITH CHECK)");
  }

  // ── 3. Public read: anon (signed-out) sees the check-in ──
  {
    const { data, error } = await anon.from("check_ins").select("*").eq("id", insertedId).maybeSingle();
    ok(!error && data?.venue_name === "E2E Ramen Bar", "public/anon read sees the check-in");
    ok(data && !("email" in data), "row exposes no email column (author snapshot only)");
  }

  // ── 4. Cross-user delete denied (RLS USING) ──
  {
    await B.from("check_ins").delete().eq("id", insertedId);
    const { data } = await anon.from("check_ins").select("id").eq("id", insertedId).maybeSingle();
    ok(!!data, "RLS blocks another user from deleting it (row still present)");
  }

  // ── 5. Owner delete succeeds ──
  {
    const { error } = await A.from("check_ins").delete().eq("id", insertedId);
    const { data } = await anon.from("check_ins").select("id").eq("id", insertedId).maybeSingle();
    ok(!error && !data, "owner can delete own check-in (row gone)");
    insertedId = null;
  }
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  // ── Cleanup ──
  if (insertedId) await admin.from("check_ins").delete().eq("id", insertedId);
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}

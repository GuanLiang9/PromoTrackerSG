// E2E for private-by-default check-ins (migration 0012). Verifies the RLS rule:
// a check-in is visible to its owner, to anyone if the owner is public, or to an
// accepted friend — and that the global leaderboard view stays global.
// Run: node --env-file=.env.local scripts/e2e-visibility.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("Missing env"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const ts = Date.now();
const emailA = `e2e-vis-a-${ts}@example.com`;
const emailB = `e2e-vis-b-${ts}@example.com`;

let failures = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗ FAIL"} ${m}`); if (!c) failures++; };
async function signed(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}
const canSee = async (client, id) => {
  const { data } = await client.from("check_ins").select("id").eq("id", id).maybeSingle();
  return !!data;
};

const ids = [];
let checkInId = null;
try {
  for (const e of [emailA, emailB]) {
    const { data, error } = await admin.auth.admin.createUser({ email: e, password: pass, email_confirm: true });
    if (error) throw new Error(error.message);
    ids.push(data.user.id);
  }
  const [uidA, uidB] = ids;
  const A = await signed(emailA);
  const B = await signed(emailB);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // New profiles default to private.
  {
    const { data } = await admin.from("profiles").select("is_public").eq("id", uidA).single();
    ok(data?.is_public === false, "new profile defaults to private (is_public=false)");
  }

  // A checks in.
  {
    const { data, error } = await A.from("check_ins").insert({
      user_id: uidA, author_name: "Vis A", venue_name: "Private Ramen",
      latitude: 1.3536, longitude: 103.945,
    }).select("id").single();
    ok(!error && data?.id, `A can insert own check-in ${error ? "→ " + error.message : ""}`);
    checkInId = data?.id ?? null;
  }

  // Private + not friends.
  ok(await canSee(A, checkInId), "owner can see own check-in");
  ok(!(await canSee(B, checkInId)), "non-friend CANNOT see a private user's check-in");
  ok(!(await canSee(anon, checkInId)), "anon CANNOT see a private user's check-in");

  // Make A public → everyone can see.
  await admin.from("profiles").update({ is_public: true }).eq("id", uidA);
  ok(await canSee(anon, checkInId), "anon CAN see a public user's check-in");
  ok(await canSee(B, checkInId), "non-friend CAN see a public user's check-in");

  // Back to private, then become friends → friend can see.
  await admin.from("profiles").update({ is_public: false }).eq("id", uidA);
  ok(!(await canSee(B, checkInId)), "after going private again, non-friend cannot see");
  {
    const { error: reqErr } = await A.from("friendships").insert({ requester_id: uidA, addressee_id: uidB, status: "pending" });
    ok(!reqErr, "A sends friend request");
    const { error: accErr } = await B.from("friendships").update({ status: "accepted" }).eq("requester_id", uidA).eq("addressee_id", uidB);
    ok(!accErr, "B accepts");
  }
  ok(await canSee(B, checkInId), "accepted friend CAN see a private user's check-in");
  ok(!(await canSee(anon, checkInId)), "anon still cannot see the private user's check-in");

  // Leaderboard stays global.
  {
    const { data } = await anon.from("user_check_in_stats").select("user_id").eq("user_id", uidA).maybeSingle();
    ok(!!data, "global leaderboard view still exposes the (private) user's aggregate row");
  }
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  if (checkInId) await admin.from("check_ins").delete().eq("id", checkInId);
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}

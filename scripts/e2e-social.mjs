// End-to-end test for the social layer: profiles, friends, badges, the
// leaderboard view, the public_profiles view and avatar Storage RLS.
// Exercises the exact RLS paths the server actions/queries rely on.
// Run: node --env-file=.env.local scripts/e2e-social.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("Missing env"); process.exit(1); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const ts = Date.now();
const emailA = `e2e-soc-a-${ts}@example.com`;
const emailB = `e2e-soc-b-${ts}@example.com`;
const userA = `e2euser_a_${ts}`;
const userB = `e2euser_b_${ts}`;

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗ FAIL"} ${msg}`); if (!cond) failures++; };

async function signedClient(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

const createdUserIds = [];
const storagePaths = [];
try {
  for (const email of [emailA, emailB]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    createdUserIds.push(data.user.id);
  }
  const [uidA, uidB] = createdUserIds;
  const A = await signedClient(emailA);
  const B = await signedClient(emailB);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // ── Profiles ──────────────────────────────────────────────────────────────
  {
    const { error } = await A.from("profiles")
      .update({ display_name: "Alice E2E", username: userA, bio: "I love laksa" })
      .eq("id", uidA);
    ok(!error, `owner can update own profile ${error ? "→ " + error.message : ""}`);
  }
  {
    // handle_new_user seeded display_name from email; backfill works.
    const { data } = await admin.from("profiles").select("display_name").eq("id", uidB).single();
    ok(!!data?.display_name, "new user got a seeded display_name (trigger)");
  }
  {
    const { error } = await B.from("profiles").update({ bio: "hacked" }).eq("id", uidA);
    const { data } = await admin.from("profiles").select("bio").eq("id", uidA).single();
    ok(data?.bio !== "hacked", `RLS blocks updating someone else's profile ${error ? "" : "(row unchanged)"}`);
  }

  // ── public_profiles view (safe columns, public read, no email) ──────────────
  {
    const { data, error } = await anon.from("public_profiles").select("*").eq("id", uidA).maybeSingle();
    ok(!error && data?.display_name === "Alice E2E", "anon can read public_profiles");
    ok(data && !("email" in data), "public_profiles exposes NO email column");
    ok(data?.username === userA && data?.bio === "I love laksa", "public_profiles returns username + bio");
  }
  {
    const { data } = await anon.from("profiles").select("email").eq("id", uidA).maybeSingle();
    ok(!data, "anon CANNOT read the private profiles table (owner-only)");
  }

  // ── Check-ins → leaderboard view (with avatar_url) ──────────────────────────
  const insert = (c, uid, name, venue) => c.from("check_ins").insert({
    user_id: uid, author_name: name, venue_name: venue, rating: 5, cuisine: "japanese",
    area: "Tampines", latitude: 1.3536, longitude: 103.945,
  });
  await insert(A, uidA, "Alice E2E", "E2E Ramen One");
  await insert(A, uidA, "Alice E2E", "E2E Ramen Two");
  await insert(B, uidB, "Bob E2E", "E2E Cafe");
  {
    const { data, error } = await anon.from("user_check_in_stats").select("*").eq("user_id", uidA).single();
    ok(!error && data, "leaderboard view returns a row for A");
    ok(data && "avatar_url" in data, "leaderboard view exposes avatar_url column");
    // 2 check-ins*10 + 2 venues*15 + 1 day*5 = 55
    ok(data?.points === 55, `points computed correctly (got ${data?.points}, expected 55)`);
    ok(data?.author_name === "Alice E2E", "leaderboard author_name uses live display_name");
  }

  // ── Friendships ─────────────────────────────────────────────────────────────
  let edgeId = null;
  {
    const { data, error } = await A.from("friendships")
      .insert({ requester_id: uidA, addressee_id: uidB, status: "pending" })
      .select("id").single();
    ok(!error && data?.id, `A can send a pending friend request ${error ? "→ " + error.message : ""}`);
    edgeId = data?.id ?? null;
  }
  {
    const { error } = await B.from("friendships")
      .insert({ requester_id: uidA, addressee_id: uidB, status: "pending" });
    ok(!!error, "RLS blocks forging a request as another requester (WITH CHECK)");
  }
  {
    const { data } = await anon.from("friendships").select("id").eq("id", edgeId).maybeSingle();
    ok(!data, "anon cannot read friendship rows");
  }
  {
    // Addressee accepts.
    const { error } = await B.from("friendships").update({ status: "accepted" }).eq("id", edgeId);
    const { data } = await admin.from("friendships").select("status").eq("id", edgeId).single();
    ok(!error && data?.status === "accepted", "addressee can accept the request");
  }
  {
    // accepted_friend_ids logic (as A): the accepted friend is B.
    const { data } = await A.from("friendships").select("*")
      .or(`requester_id.eq.${uidA},addressee_id.eq.${uidA}`);
    const accepted = (data ?? []).filter((r) => r.status === "accepted")
      .map((r) => (r.requester_id === uidA ? r.addressee_id : r.requester_id));
    ok(accepted.length === 1 && accepted[0] === uidB, "accepted_friend_ids resolves to B");
  }
  {
    // Friends leaderboard scope (self + friends).
    const { data } = await A.from("user_check_in_stats").select("user_id").in("user_id", [uidA, uidB]);
    ok((data ?? []).length === 2, "friends leaderboard returns self + friend");
  }

  // ── user_badges ─────────────────────────────────────────────────────────────
  {
    const { error } = await A.from("user_badges").insert({ user_id: uidA, badge_id: "first-bite" });
    ok(!error, `owner can record an earned badge ${error ? "→ " + error.message : ""}`);
  }
  {
    const { data } = await anon.from("user_badges").select("badge_id").eq("user_id", uidA);
    ok((data ?? []).some((b) => b.badge_id === "first-bite"), "badges are publicly readable");
  }
  {
    const { error } = await B.from("user_badges").insert({ user_id: uidA, badge_id: "centurion" });
    ok(!!error, "RLS blocks recording a badge for another user");
  }

  // ── User search (public_profiles ilike) ─────────────────────────────────────
  {
    const { data } = await anon.from("public_profiles").select("id").ilike("username", `%${userA}%`);
    ok((data ?? []).some((r) => r.id === uidA), "user search finds A by username");
  }

  // ── Avatar Storage RLS ──────────────────────────────────────────────────────
  {
    const pathA = `${uidA}/avatar-${ts}.png`;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const { error } = await A.storage.from("avatars").upload(pathA, png, { contentType: "image/png", upsert: true });
    ok(!error, `owner can upload to their avatar folder ${error ? "→ " + error.message : ""}`);
    if (!error) storagePaths.push(pathA);

    const { error: bErr } = await B.storage.from("avatars").upload(`${uidA}/hack.png`, png, { contentType: "image/png" });
    ok(!!bErr, "RLS blocks uploading into another user's avatar folder");

    const { data: pub } = anon.storage.from("avatars").getPublicUrl(pathA);
    const res = await fetch(pub.publicUrl);
    ok(res.ok, "uploaded avatar is publicly readable");
  }
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  for (const p of storagePaths) await admin.storage.from("avatars").remove([p]).catch(() => {});
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}

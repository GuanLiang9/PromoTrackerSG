// Reproduce an AUTHENTICATED request to /profile (and /u/[id]) on the live site,
// using the exact @supabase/ssr cookie encoding so we see what a signed-in user
// actually gets (not the login redirect an anonymous curl receives).
// Run: node --env-file=.env.local scripts/repro-profile.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.argv[2] || "https://promosg.pages.dev";

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const email = `repro-${Date.now()}@example.com`;

let userId = null;
try {
  // 1) confirmed user + sign in to get a real session
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
  if (cErr) throw new Error("createUser: " + cErr.message);
  userId = created.user.id;

  const signer = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: s, error: sErr } = await signer.auth.signInWithPassword({ email, password: pass });
  if (sErr) throw new Error("signIn: " + sErr.message);

  // 2) capture the exact cookies @supabase/ssr would write for this session
  const jar = [];
  const ssr = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => { for (const c of cookies) jar.push(c); },
    },
  });
  await ssr.auth.setSession({ access_token: s.session.access_token, refresh_token: s.session.refresh_token });
  const cookieHeader = jar.map((c) => `${c.name}=${c.value}`).join("; ");
  console.log(`Captured ${jar.length} cookie chunk(s): ${jar.map((c) => c.name).join(", ")}`);

  // 3) fetch the authed pages
  async function hit(path) {
    const res = await fetch(BASE + path, { headers: { cookie: cookieHeader }, redirect: "manual" });
    const body = await res.text();
    const loc = res.headers.get("location");
    const markers = {
      editProfile: body.includes("Edit profile"),
      timeline: /Timeline|Check-?ins|No check-?ins/i.test(body),
      nextError: /Application error|something went wrong|__next_error__/i.test(body),
      loginForm: /Sign in|password/i.test(body) && /name="password"/i.test(body),
    };
    console.log(`\n${path} → ${res.status}${loc ? " → " + loc : ""}  (${body.length} bytes)`);
    console.log("  markers:", markers);
    if (res.status >= 500) console.log("  BODY HEAD:", body.slice(0, 800).replace(/\s+/g, " "));
    return { status: res.status, loc, markers };
  }

  await hit("/profile");
  await hit(`/u/${userId}`);
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

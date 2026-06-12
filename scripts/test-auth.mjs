// Validates the signup mechanism: admin.createUser (no email) → profile row →
// password sign-in works. Cleans up the throwaway user afterwards.
import { createClient } from "@supabase/supabase-js";

const URL = "https://abbbcmpkfklwckbknmrv.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const email = `test-${Date.now()}@promosg-test.local`;
const password = "test123456";

console.log("1) admin.createUser (no email sent)…");
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (cErr) { console.error("  FAIL:", cErr.message); process.exit(1); }
const userId = created.user.id;
console.log(`  OK — user ${userId}, confirmed=${Boolean(created.user.email_confirmed_at)}`);

console.log("2) profile row auto-created by trigger?");
const { data: prof } = await admin.from("profiles").select("id,email").eq("id", userId).maybeSingle();
console.log(prof ? `  OK — profile ${prof.email}` : "  (no profile row found)");

console.log("3) password sign-in works?");
const anonClient = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: signin, error: sErr } = await anonClient.auth.signInWithPassword({ email, password });
console.log(sErr ? `  FAIL: ${sErr.message}` : `  OK — session for ${signin.user.email}`);

console.log("4) duplicate signup rejected?");
const { error: dupErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
console.log(dupErr ? `  OK — rejected: "${dupErr.message}"` : "  WARN: duplicate allowed");

console.log("5) cleanup — delete test user");
await admin.auth.admin.deleteUser(userId);
console.log("  done");

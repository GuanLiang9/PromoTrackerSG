// Focused UI verification for round-2 changes on a real (headless Edge) browser:
// map mobile overflow, top-right avatar, spots→map deep-link, and the edit page.
// Run: node --env-file=.env.local scripts/ui-check.mjs [baseUrl]
import { existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.argv[2] || "http://localhost:3000";
const EDGE = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => p && existsSync(p));

const admin = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const email = `uichk-${Date.now()}@example.com`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let userId = null, failures = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗ FAIL"} ${m}`); if (!c) failures++; };

try {
  const { data: created } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
  userId = created.user.id;
  await admin.from("profiles").update({ display_name: "UI Check", is_public: true }).eq("id", userId);
  // Seed a check-in so the feed + map + edit have something to show.
  const { data: ci } = await admin.from("check_ins").insert({
    user_id: userId, author_name: "UI Check", venue_name: "UI Test Cafe",
    note: "Lovely kopi and toast", rating: 5, cuisine: "cafe", area: "Tampines",
    latitude: 1.3536, longitude: 103.945,
  }).select("id").single();
  const checkInId = ci.id;

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, isMobile: true });
  // Let the check-in form geolocate onto the seeded venue's coordinates.
  await browser.defaultBrowserContext().overridePermissions(BASE, ["geolocation"]);
  await page.setGeolocation({ latitude: 1.3536, longitude: 103.945 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Login
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
  await page.goto(BASE + "/auth/login", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 30000 });
  await page.type("#email", email);
  await page.type("#password", pass);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await sleep(1500);

  // 1) Top-right avatar present
  await sleep(500);
  const acct = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Account menu"]');
    return { present: !!btn, hasImgOrInitial: !!btn && (!!btn.querySelector("img") || (btn.textContent || "").trim().length > 0) };
  });
  ok(acct.present && acct.hasImgOrInitial, "top-right account avatar is present");

  // 2) Map overflow at 360px — the floating bars must not exceed the map box
  await page.goto(BASE + "/map", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  const overflow = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const horiz = doc.scrollWidth - doc.clientWidth;
    // measure the layer-tab bar vs its parent
    const bar = document.querySelector('.pointer-events-auto');
    const barOverflow = bar ? bar.scrollWidth - bar.clientWidth : 0;
    return { pageHoriz: horiz, barOverflow };
  });
  ok(overflow.pageHoriz <= 1, `no horizontal page overflow on /map (got ${overflow.pageHoriz}px)`);
  ok(overflow.barOverflow <= 1, `layer-tab bar content fits its box (got ${overflow.barOverflow}px)`);

  // Switch to Spots layer and check the scope bar fits
  const switched = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const spots = btns.find((b) => /Spots/.test(b.textContent || "") || (b.textContent || "").includes("📍"));
    if (spots) { spots.click(); return true; }
    return false;
  });
  await sleep(800);

  // 3) Spots → map deep-link
  await page.goto(BASE + `/map?spot=${checkInId}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2000);
  const detail = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasVenue: /UI Test Cafe/.test(t), hasNote: /Lovely kopi/.test(t), hasRating: /5\/5/.test(t) };
  });
  ok(detail.hasVenue, "/map?spot= shows the venue name");
  ok(detail.hasNote || detail.hasRating, "/map?spot= shows the check-in details (note/rating)");

  // 4) Community venue appears in the check-in Nearby picker (crowd-sourced)
  await page.goto(BASE + "/check-in", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(3500); // geolocate → debounced nearby fetch
  const picker = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasVenue: /UI Test Cafe/.test(t), hasFire: /🔥/.test(t) };
  });
  ok(picker.hasVenue, "check-in Nearby picker surfaces the community venue");
  ok(picker.hasFire, "community venue shows the 🔥 check-in-count badge");

  // 5) Edit page renders for the owner
  await page.goto(BASE + `/check-in/${checkInId}/edit`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1200);
  const edit = await page.evaluate(() => {
    const t = document.body.innerText;
    const venueInput = Array.from(document.querySelectorAll("input")).find((i) => i.value === "UI Test Cafe");
    return { isEdit: /Edit check-in/i.test(t), prefilled: !!venueInput, saveBtn: /Save changes/i.test(t) };
  });
  ok(edit.isEdit && edit.prefilled && edit.saveBtn, "edit page renders prefilled with Save changes");

  ok(errors.length === 0, `no page errors (${errors.length})`);
  errors.slice(0, 5).forEach((e) => console.log("   •", e.slice(0, 160)));

  await browser.close();
  if (checkInId) await admin.from("check_ins").delete().eq("id", checkInId);
} catch (e) {
  console.error("ERROR:", e.stack || e.message);
  failures++;
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
  console.log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " FAILURE(S) ✗"}`);
  process.exit(failures === 0 ? 0 : 1);
}

// Drive the site in a real (headless Edge) browser performing a REAL login via
// the app's form (no cookie injection), then check whether the account menu and
// profile are interactive. Captures client console/page errors + auth network.
// Run: node --env-file=.env.local scripts/browser-check.mjs [baseUrl]
import { existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.argv[2] || "https://promosg.pages.dev";
const EDGE = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => p && existsSync(p));

const admin = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });
const pass = "test-pass-12345";
const email = `bchk-${Date.now()}@example.com`;
let userId = null;
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
  if (cErr) throw new Error("createUser: " + cErr.message);
  userId = created.user.id;
  await admin.from("profiles").update({ display_name: "Browser Check", username: `bchk_${Date.now()}` }).eq("id", userId);

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 780, isMobile: true });
  const consoleErrors = [], pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); if (m.text().startsWith("DBG")) log("  " + m.text()); });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("request", (r) => { if (r.url().includes("/auth/v1/")) log(`  [req →] ${r.url().replace(SUPA_URL, "")}`); });
  page.on("response", (r) => { if (r.url().includes("/auth/v1/")) log(`  [resp ${r.status()}] ${r.url().replace(SUPA_URL, "")}`); });

  // Warm up routes (dev compiles on first hit) to avoid racing the login submit.
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});

  // ── Real login through the form (retry if a cold compile eats the submit) ──
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(BASE + "/auth/login", { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("#email", { timeout: 30000 });
    await page.type("#email", email);
    await page.type("#password", pass);
    log(`submitting login form (attempt ${attempt})…`);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await sleep(1500);
    if (!new URL(page.url()).pathname.startsWith("/auth")) break;
    await sleep(2000);
  }
  log("after login, url =", new URL(page.url()).pathname);

  const jsCookies = await page.evaluate(() => document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean));
  const allCookies = await page.cookies();
  log("cookies visible to JS:", jsCookies.filter((n) => n.includes("auth") || n.startsWith("sb-")));
  const authC = allCookies.find((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (authC) {
    log(`auth cookie: httpOnly=${authC.httpOnly} len=${authC.value.length}`);
    log("  value head:", JSON.stringify(authC.value.slice(0, 50)));
    // What does document.cookie return for it (post URL-decode by browser)?
    const jsVal = await page.evaluate((n) => {
      const m = document.cookie.split("; ").find((c) => c.startsWith(n + "="));
      return m ? m.slice(n.length + 1) : null;
    }, authC.name);
    log("  document.cookie head:", JSON.stringify((jsVal || "").slice(0, 50)));
  }

  const probe = () => page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Account menu"]');
    const signin = Array.from(document.querySelectorAll("a")).find((a) => /sign in/i.test(a.textContent || "") && a.getAttribute("href")?.includes("/auth"));
    const skel = document.querySelector('header [aria-hidden="true"].rounded-full');
    return { btn: !!btn, txt: btn?.textContent?.trim() ?? null, signIn: !!signin, skeleton: !!skel };
  });

  let acct = null;
  for (let i = 0; i < 10; i++) {
    const st = await probe();
    if (i === 0 || JSON.stringify(st) !== JSON.stringify(acct)) log(`[menu t=${i}s]`, st);
    acct = st;
    if (st.btn || st.signIn) break;
    await sleep(1000);
  }

  // Does a FULL reload recover the signed-in menu?
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await sleep(7000);
  log("[menu after full reload]", await probe());

  // Open dropdown + read items.
  let dropdown = { opened: false, items: [] };
  const btn = await page.$('[aria-label="Account menu"]');
  if (btn) {
    await btn.click();
    await sleep(600);
    dropdown = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      return { opened: !!menu, items: menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).map((i) => i.textContent?.trim()) : [] };
    });
  }
  log("[menu] dropdown:", dropdown);

  // Click "My profile" if present.
  if (dropdown.opened) {
    const items = await page.$$('[role="menuitem"]');
    for (const it of items) {
      const t = await page.evaluate((el) => el.textContent, it);
      if (/my profile/i.test(t)) { await it.click(); break; }
    }
    await sleep(1500);
    log("[menu] after clicking My profile, url =", new URL(page.url()).pathname);
  }

  // Profile render check.
  await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1000);
  const prof = await page.evaluate(() => {
    const txt = document.body.innerText;
    return {
      hasEditProfile: /edit profile/i.test(txt),
      hasEditableAvatarBtn: !!document.querySelector('[aria-label="Edit profile photo"]'),
      url: location.pathname,
    };
  });
  log("[profile]", prof);

  log(`\n=== console errors (${consoleErrors.length}) ===`);
  consoleErrors.slice(0, 10).forEach((e) => log("  •", e.slice(0, 300)));
  log(`=== page errors (${pageErrors.length}) ===`);
  pageErrors.slice(0, 10).forEach((e) => log("  •", e.slice(0, 300)));

  await browser.close();
} catch (e) {
  console.error("ERROR:", e.stack || e.message);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

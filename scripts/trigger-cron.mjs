import { readFileSync } from "fs";
import { resolve } from "path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const url = new URL("/api/cron/expire", env.NEXT_PUBLIC_SITE_URL ?? "https://promosg.pages.dev");
url.searchParams.set("secret", env.CRON_SECRET);

console.log("POST", url.origin + url.pathname + "?secret=[redacted]");
const res = await fetch(url.toString());
const body = await res.json();
console.log("Status:", res.status);
console.log(JSON.stringify(body, null, 2));

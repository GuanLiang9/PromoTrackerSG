/**
 * Build and deploy to Cloudflare Pages, reading credentials from .env.local.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#") && l.trim())
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

process.env.CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
process.env.CLOUDFLARE_API_TOKEN = env.CLOUDFLARE_API_TOKEN;

console.log("Building...");
execSync("npm run pages:build", { stdio: "inherit" });

console.log("\nDeploying...");
execSync("npm run pages:deploy", { stdio: "inherit" });

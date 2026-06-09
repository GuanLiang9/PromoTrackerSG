/**
 * Reads secrets from .env.local and upserts them as Cloudflare Pages environment
 * variables via the REST API (non-encrypted vars + encrypted secrets).
 *
 * Secrets set: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, OPENROUTER_API_KEY
 * (These must never go in wrangler.toml which is committed to git.)
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#") && l.trim())
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = env.CLOUDFLARE_API_TOKEN;
const PROJECT = "promosg";

const SECRETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "OPENROUTER_API_KEY",
];

const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`;

// Fetch current deployment configs
const getRes = await fetch(base, {
  headers: { Authorization: `Bearer ${API_TOKEN}` },
});
const project = await getRes.json();
if (!project.success) {
  console.error("Failed to fetch project:", project.errors);
  process.exit(1);
}

const existing = project.result?.deployment_configs?.production?.env_vars ?? {};

// Merge in secrets (type: secret_text so they're encrypted at rest)
const merged = { ...existing };
for (const key of SECRETS) {
  const value = env[key];
  if (!value) { console.warn(`SKIP ${key} — not found in .env.local`); continue; }
  merged[key] = { type: "secret_text", value };
  console.log(`SET  ${key}`);
}

// PATCH the project
const patchRes = await fetch(base, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deployment_configs: {
      production: { env_vars: merged },
    },
  }),
});
const result = await patchRes.json();
if (result.success) {
  console.log("\nSecrets updated. Trigger a new deploy or redeploy for them to take effect.");
} else {
  console.error("PATCH failed:", JSON.stringify(result.errors, null, 2));
  process.exit(1);
}

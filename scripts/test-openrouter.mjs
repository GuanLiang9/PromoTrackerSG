import { readFileSync } from "fs";
import { resolve } from "path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#") && l.trim())
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const model = env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
const key = env.OPENROUTER_API_KEY;

if (!key) { console.error("No OPENROUTER_API_KEY in .env.local"); process.exit(1); }

const body = JSON.stringify({
  model,
  temperature: 0.3,
  max_tokens: 60,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: "Return ONLY JSON with key test set to 'ok'." },
    { role: "user", content: "test" },
  ],
});

console.log("Testing model:", model);
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://promosg.pages.dev",
    "X-Title": "PromoSG Test",
  },
  body,
});

console.log("Status:", res.status);
const json = await res.json();
console.log(JSON.stringify(json, null, 2));

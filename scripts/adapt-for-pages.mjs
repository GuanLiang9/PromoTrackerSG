// Adapts the .open-next/ Worker build for Cloudflare Pages _worker.js deployment.
// Copies the full source tree so wrangler can resolve all relative imports when
// it bundles _worker.js at deploy time.
import { cpSync, copyFileSync, readdirSync, rmSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OPEN_NEXT = join(ROOT, ".open-next");
const DEST = join(ROOT, "pages-dist");

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

// 1. Copy static assets to root of pages-dist.
cpSync(join(OPEN_NEXT, "assets"), DEST, { recursive: true });

// 2. Copy every non-assets entry from .open-next/ to pages-dist/
//    so wrangler can resolve all relative imports in worker.js.
for (const entry of readdirSync(OPEN_NEXT)) {
  if (entry === "assets" || entry === "worker.js") continue; // handled separately
  const src = join(OPEN_NEXT, entry);
  const dst = join(DEST, entry);
  if (statSync(src).isDirectory()) {
    cpSync(src, dst, { recursive: true });
  } else {
    copyFileSync(src, dst);
  }
}

// 3. worker.js → _worker.js (Pages convention).
copyFileSync(join(OPEN_NEXT, "worker.js"), join(DEST, "_worker.js"));

// 4. Route rules.
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/icons/*",
    "/sw.js",
    "/manifest.webmanifest",
    "/BUILD_ID",
  ],
};
writeFileSync(join(DEST, "_routes.json"), JSON.stringify(routes, null, 2));

console.log("pages-dist/ ready — entries:", readdirSync(DEST).join(", "));

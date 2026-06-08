/**
 * Lightweight scheduled Worker for PromoSG.
 *
 * The main app is served by an OpenNext Worker which only exposes a `fetch`
 * handler, so it can't receive Cloudflare Cron Triggers directly. This tiny
 * companion Worker runs on a schedule and pings the app's protected cron
 * endpoints (ingest + expire) over public fetch.
 */
const APP_URL = "https://promosg.guanliang976.workers.dev";

async function hit(path, secret) {
  const res = await fetch(`${APP_URL}${path}?secret=${secret}`, {
    method: "POST",
  });
  const body = await res.text();
  console.log(`${path} -> ${res.status} ${body}`);
}

export default {
  async scheduled(event, env, ctx) {
    const secret = env.CRON_SECRET;
    ctx.waitUntil(
      (async () => {
        // Archive expired promotions, then pull fresh ones.
        await hit("/api/cron/expire", secret);
        await hit("/api/cron/ingest", secret);
      })(),
    );
  },

  // Allow manual trigger via HTTP for testing.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    await hit("/api/cron/expire", env.CRON_SECRET);
    await hit("/api/cron/ingest", env.CRON_SECRET);
    return new Response("triggered\n");
  },
};

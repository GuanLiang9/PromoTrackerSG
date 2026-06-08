/**
 * Lightweight scheduled Worker for PromoSG.
 *
 * The main app is served by an OpenNext Worker which only exposes a `fetch`
 * handler, so it can't receive Cloudflare Cron Triggers directly. This tiny
 * companion Worker runs on a schedule and pings the app's protected cron
 * endpoints over public fetch.
 *
 * Schedule (UTC; Singapore is UTC+8):
 *   - "0 18 * * *"   daily  02:00 SGT → expire (archive ended promos; no AI, free)
 *   - "30 18 * * SUN" weekly Mon 02:30 SGT → ingest new deals (minimal AI usage)
 */
const APP_URL = "https://promosg.pages.dev";
const WEEKLY_INGEST = "30 18 * * SUN";

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
        // Always archive expired promotions (cheap, no AI).
        await hit("/api/cron/expire", secret);
        // Only pull fresh deals on the weekly trigger.
        if (event.cron === WEEKLY_INGEST) {
          await hit("/api/cron/ingest", secret);
        }
      })(),
    );
  },

  // Manual trigger for testing: ?secret=...&ingest=1 to also run ingest.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    await hit("/api/cron/expire", env.CRON_SECRET);
    if (url.searchParams.get("ingest") === "1") {
      await hit("/api/cron/ingest", env.CRON_SECRET);
    }
    return new Response("triggered\n");
  },
};

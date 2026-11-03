import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import { buildAdapters } from "@/lib/ingestion/sources";
import { OpenRouterExtractor } from "@/lib/ingestion/openrouter-extractor";
import { brandCategory, classifyContentType } from "@/lib/ingestion/extractor";
import { upsertPromotions } from "@/lib/ingestion/upsert";
import { geocodeFromDictionary, geocodeLocation } from "@/lib/ingestion/geocode";
import { resolveImage } from "@/lib/ingestion/image-resolver";

// Blog / review channels post mostly editorial (reviews, features, roundups);
// bias them toward 'news' unless their title carries a real deal.
const EDITORIAL_SOURCES = new Set([
  "Daniel Food Diary", "Eatbook", "Eatbook SG", "Seth Lui", "Miss Tam Chiak",
  "SG Food Lover", "SG Foodies", "The Honeycombers SG", "The Smart Local",
]);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Ingestion job: pull from live sources (public Telegram channels + RSS),
 * extract structured promotions with the OpenRouter LLM (regex fallback), and
 * upsert them into the promotions table (dedup on dedupe_key).
 *
 * Protected by CRON_SECRET. Trigger manually or on a schedule:
 *   GET/POST /api/cron/ingest?secret=...
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cloudflare Workers cap subrequests per invocation (50 on the free plan), so
  // the defaults are conservative. Optional query params let a trusted caller
  // (e.g. a local bulk run, which has no subrequest limit) pull far more:
  //   ?max=<total items>&attempts=<llm retries>&limit=<items per source>
  const sp = request.nextUrl.searchParams;
  const clamp = (v: string | null, def: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(n, hi) : def;
  };
  const maxItems = clamp(sp.get("max"), 12, 500); // 19 sources + LLM calls must fit the 50-subrequest cap
  const maxAttempts = clamp(sp.get("attempts"), 1, 4);
  const perSource = clamp(sp.get("limit"), 6, 40);

  const supabase = createAdminClient();

  // Posts already ingested → skipped before any LLM call, so recurring runs
  // only spend AI on genuinely new deals (keeps usage in the free zone).
  const { data: existing } = await supabase
    .from("promotions")
    .select("external_id")
    .not("external_id", "is", null);
  const seen = new Set(
    (existing ?? [])
      .map((r) => r.external_id as string | null)
      .filter((v): v is string => Boolean(v)),
  );

  const extractor = new OpenRouterExtractor({ maxAttempts });
  const pipeline = new IngestionPipeline(buildAdapters(perSource), extractor, {
    maxItems,
  });

  let normalized;
  try {
    normalized = await pipeline.run(seen);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pipeline failed" },
      { status: 500 },
    );
  }

  // Deterministic content-type guardrail: classify on the (clean) title plus
  // the source's editorial nature, trusting the LLM only for 'food_spot'. This
  // keeps deals, news, events and food recommendations from crossing over even
  // when the free model errs or falls back to regex.
  for (const p of normalized) {
    p.contentType = classifyContentType(
      p.title,
      EDITORIAL_SOURCES.has(p.sourceName),
      p.contentType,
    );
    p.category = brandCategory(p.title, p.category);
  }

  // Geocode locations so promos can appear on the map. The dictionary is free
  // and unlimited; live Nominatim calls are capped per run to stay within the
  // Workers subrequest budget (the rest can be filled by the backfill script).
  const MAX_LIVE_GEOCODES = 8;
  let liveGeocodes = 0;
  let geocoded = 0;
  for (const p of normalized) {
    // Dictionary match against location + title + description (free, no network).
    const dictText = [p.location, p.title, p.description]
      .filter(Boolean)
      .join(" ");
    let coords = geocodeFromDictionary(dictText);
    if (!coords && p.location && liveGeocodes < MAX_LIVE_GEOCODES) {
      liveGeocodes++;
      coords = await geocodeLocation(p.location);
    }
    if (coords) {
      p.latitude = coords.lat;
      p.longitude = coords.lng;
      geocoded++;
    }
  }

  // Give every imageless promo a relevant stock photo. Resolution order:
  // learned overrides → LLM image subject → title keyword → category default.
  const { data: ovRows } = await supabase
    .from("image_overrides")
    .select("keyword, image_url");
  const overrides = new Map<string, string>(
    (ovRows ?? []).map((r) => [r.keyword as string, r.image_url as string]),
  );
  let imaged = 0;
  const imageSources: Record<string, number> = {};
  for (const p of normalized) {
    if (!p.imageUrl) {
      const { url, source } = resolveImage(p.title, p.description, p.category, {
        subject: p.imageSubject,
        overrides,
      });
      p.imageUrl = url;
      imageSources[source] = (imageSources[source] ?? 0) + 1;
      imaged++;
    }
  }

  const result = await upsertPromotions(supabase, normalized);

  await supabase.from("ingestion_logs").insert({
    status: result.error ? "error" : "ok",
    items_found: normalized.length,
    items_saved: result.saved,
    message: result.error ?? `extractor=${extractor.name}`,
  });

  return NextResponse.json({
    extractor: extractor.name,
    ai_enabled: extractor.isConfigured,
    found: normalized.length,
    geocoded,
    imaged,
    image_sources: imageSources,
    ...result,
    ran_at: new Date().toISOString(),
  });
}

export const GET = POST;

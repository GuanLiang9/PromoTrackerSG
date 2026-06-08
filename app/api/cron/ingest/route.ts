import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import { buildAdapters } from "@/lib/ingestion/sources";
import { OpenRouterExtractor } from "@/lib/ingestion/openrouter-extractor";
import { upsertPromotions } from "@/lib/ingestion/upsert";

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
  const maxItems = clamp(sp.get("max"), 30, 500);
  const maxAttempts = clamp(sp.get("attempts"), 1, 4);
  const perSource = clamp(sp.get("limit"), 8, 40);

  const extractor = new OpenRouterExtractor({ maxAttempts });
  const pipeline = new IngestionPipeline(buildAdapters(perSource), extractor, {
    maxItems,
  });

  let normalized;
  try {
    normalized = await pipeline.run();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pipeline failed" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
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
    ...result,
    ran_at: new Date().toISOString(),
  });
}

export const GET = POST;

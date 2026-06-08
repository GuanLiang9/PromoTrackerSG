import type {
  ExtractedPromotion,
  PromotionExtractor,
  RawItem,
  SourceAdapter,
} from "@/lib/ingestion/types";

export interface NormalizedPromotion extends ExtractedPromotion {
  externalId: string;
  sourceName: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  /** Hash used for deduplication. */
  dedupeKey: string;
}

/** Lowercased, whitespace-collapsed string for stable comparisons. */
function canonical(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function makeDedupeKey(sourceName: string, title: string): string {
  return `${canonical(sourceName)}::${canonical(title).slice(0, 80)}`;
}

/**
 * Runs adapters → extractor → normalize → dedupe. Returns ready-to-upsert
 * records. Persisting (Supabase upsert) is intentionally left to the caller so
 * the pipeline stays pure and testable.
 */
export interface PipelineOptions {
  /**
   * Hard cap on the number of items extracted per run. Bounds the number of
   * LLM subrequests so the run stays within Cloudflare Workers' per-invocation
   * subrequest limit (50 on the free plan).
   */
  maxItems?: number;
}

export class IngestionPipeline {
  constructor(
    private readonly adapters: SourceAdapter[],
    private readonly extractor: PromotionExtractor,
    private readonly options: PipelineOptions = {},
  ) {}

  /**
   * @param skipExternalIds source ids already in the DB. Matching items are
   *   skipped *before* extraction so the LLM is never called for them — this is
   *   what keeps AI usage minimal on recurring runs (only new posts cost a call).
   */
  async run(skipExternalIds: Set<string> = new Set()): Promise<NormalizedPromotion[]> {
    const seen = new Set<string>();
    const out: NormalizedPromotion[] = [];
    const maxItems = this.options.maxItems ?? Infinity;

    for (const adapter of this.adapters) {
      if (out.length >= maxItems) break;
      let items: RawItem[] = [];
      try {
        items = await adapter.fetch();
      } catch (err) {
        // One bad source shouldn't fail the whole run.
        console.error(`[ingestion] adapter ${adapter.name} failed:`, err);
        continue;
      }

      for (const item of items) {
        if (out.length >= maxItems) break;
        // Already ingested this exact post → skip without an LLM call.
        if (skipExternalIds.has(item.externalId)) continue;
        const extracted = await this.safeExtract(item);
        if (!extracted) continue;

        const dedupeKey = makeDedupeKey(item.sourceName, extracted.title);
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        out.push({
          ...extracted,
          externalId: item.externalId,
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl ?? null,
          imageUrl: item.imageUrl ?? null,
          dedupeKey,
        });
      }
    }

    return out;
  }

  private async safeExtract(item: RawItem): Promise<ExtractedPromotion | null> {
    try {
      return await this.extractor.extract(item);
    } catch (err) {
      console.error(`[ingestion] extract failed for ${item.externalId}:`, err);
      return null;
    }
  }
}

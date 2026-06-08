import type { PromoCategory } from "@/lib/types";

/** Raw, unstructured item pulled from a source before extraction. */
export interface RawItem {
  /** Stable id from the source (used for dedup), e.g. telegram message id. */
  externalId: string;
  sourceName: string;
  sourceUrl?: string;
  text: string;
  imageUrl?: string;
  publishedAt?: string;
}

/** Structured promotion produced by an extractor. */
export interface ExtractedPromotion {
  title: string;
  description: string;
  category: PromoCategory;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  tags: string[];
}

/** A source adapter fetches raw items from one channel/feed/site. */
export interface SourceAdapter {
  readonly name: string;
  readonly kind: "telegram" | "rss" | "website" | "event_site";
  fetch(): Promise<RawItem[]>;
}

/**
 * Turns raw promotion text into structured data. The MVP ships a deterministic
 * `RegexExtractor`; an LLM-backed extractor can be dropped in behind this same
 * interface without touching the pipeline.
 */
export interface PromotionExtractor {
  readonly name: string;
  extract(item: RawItem): Promise<ExtractedPromotion | null>;
}

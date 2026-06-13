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

/**
 * What kind of content an item is — keeps deals, food recommendations, news
 * and events from crossing over between surfaces.
 *   promotion → a real deal/offer (1-for-1, % off, free, sale…)
 *   food_spot → a food recommendation / place to eat (no specific deal)
 *   event     → a festival, market, pop-up, fair, concert
 *   news      → editorial: openings, launches, reviews, guides, closures
 */
export type ContentType = "promotion" | "food_spot" | "event" | "news";

/** Structured promotion produced by an extractor. */
export interface ExtractedPromotion {
  title: string;
  description: string;
  category: PromoCategory;
  contentType: ContentType;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  tags: string[];
  /**
   * LLM-distilled concrete photo subject (e.g. "tonkotsu ramen bowl") used to
   * pick a relevant stock image. Null when produced by the regex fallback.
   */
  imageSubject?: string | null;
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

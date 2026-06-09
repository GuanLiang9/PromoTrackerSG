/**
 * Core domain types for PromoSG.
 *
 * `PromoCategory` and `PromoStatus` mirror the Postgres enums defined in
 * supabase/migrations/0001_init.sql. Keep them in sync.
 */

export type PromoCategory =
  | "food_beverage"
  | "shopping"
  | "attractions"
  | "events"
  | "travel"
  | "credit_card"
  | "entertainment"
  | "lifestyle";

export type PromoStatus = "draft" | "pending" | "active" | "archived";

/** A row from the `promotions` table (snake_case, as returned by Supabase). */
export interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  category: PromoCategory;
  start_date: string; // ISO date (YYYY-MM-DD)
  end_date: string; // ISO date (YYYY-MM-DD)
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  tags: string[];
  terms: string | null;
  status: PromoStatus;
  created_at: string;
  updated_at: string;
  discount_pct: number | null;
  savings_amount: number | null;
  base_score: number | null;
  score_reasons: string[];
  saved_count: number;
}

/** View model used throughout the UI. */
export interface Promotion {
  id: string;
  title: string;
  description: string;
  category: PromoCategory;
  startDate: string;
  endDate: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  tags: string[];
  terms: string | null;
  status: PromoStatus;
  createdAt: string;
  updatedAt: string;
  discountPct: number | null;
  savingsAmount: number | null;
  /** Precomputed deterministic 0-100 base score (no personalization). */
  baseScore: number | null;
  /** Human-readable reasons backing the base score. */
  scoreReasons: string[];
  /** Number of users who have saved this promotion. */
  savedCount: number;
  /** Whether the current user has bookmarked this promotion. */
  isSaved?: boolean;
}

export interface SavedPromotionRow {
  id: string;
  user_id: string;
  promotion_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

/**
 * Sort/section view for the search results. Each value mirrors a dashboard
 * section: it implies both an ordering and (for today/newest/ending) a date
 * window applied in `searchPromotions`.
 */
export type PromotionSort = "today" | "newest" | "ending" | "trending";

/** Search / filter parameters parsed from the URL. */
export interface PromotionFilters {
  query?: string;
  categories?: PromoCategory[];
  from?: string; // ISO date
  to?: string; // ISO date
  location?: string;
  sort?: PromotionSort;
}

export type CalendarView = "month" | "week" | "day";

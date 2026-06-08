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

/** Search / filter parameters parsed from the URL. */
export interface PromotionFilters {
  query?: string;
  categories?: PromoCategory[];
  from?: string; // ISO date
  to?: string; // ISO date
  location?: string;
}

export type CalendarView = "month" | "week" | "day";

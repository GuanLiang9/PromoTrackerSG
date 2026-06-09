import type { PromoCategory } from "@/lib/types";

export interface CategoryMeta {
  value: PromoCategory;
  label: string;
  /** Short label for compact chips. */
  short: string;
  /** Tailwind classes for a solid badge (light + dark). */
  badgeClass: string;
  /** Tailwind classes for a soft chip background used on the calendar. */
  chipClass: string;
  /** Tailwind classes for the small dot indicator. */
  dotClass: string;
  emoji: string;
  /** Fallback cover image shown when a promotion has no imageUrl. */
  fallbackImage: string;
}

/**
 * Single source of truth for category presentation. Used by calendar chips,
 * badges, legends and filters so colors stay consistent everywhere.
 */
// Stable Unsplash photo IDs used as category fallback covers.
// Format: images.unsplash.com/photo-{ID}?w=600&h=400&fit=crop&auto=format&q=75
const UNS = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop&auto=format&q=75`;

export const CATEGORY_META: Record<PromoCategory, CategoryMeta> = {
  food_beverage: {
    value: "food_beverage",
    label: "Food & Beverage",
    short: "Food",
    badgeClass: "bg-orange-500 text-white",
    chipClass:
      "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
    dotClass: "bg-orange-500",
    emoji: "🍜",
    fallbackImage: UNS("1504674900247-0877df9cc836"),
  },
  shopping: {
    value: "shopping",
    label: "Shopping",
    short: "Shopping",
    badgeClass: "bg-pink-500 text-white",
    chipClass:
      "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200",
    dotClass: "bg-pink-500",
    emoji: "🛍️",
    fallbackImage: UNS("1483985988355-763728e1935b"),
  },
  attractions: {
    value: "attractions",
    label: "Attractions",
    short: "Attractions",
    badgeClass: "bg-emerald-500 text-white",
    chipClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
    emoji: "🎡",
    fallbackImage: UNS("1512917647-6291fecb1849"),
  },
  events: {
    value: "events",
    label: "Events",
    short: "Events",
    badgeClass: "bg-violet-500 text-white",
    chipClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
    dotClass: "bg-violet-500",
    emoji: "🎪",
    fallbackImage: UNS("1540575467063-178a50c2df87"),
  },
  travel: {
    value: "travel",
    label: "Travel",
    short: "Travel",
    badgeClass: "bg-sky-500 text-white",
    chipClass:
      "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    dotClass: "bg-sky-500",
    emoji: "✈️",
    fallbackImage: UNS("1436491865332-7a61a109cc05"),
  },
  credit_card: {
    value: "credit_card",
    label: "Credit Card",
    short: "Cards",
    badgeClass: "bg-indigo-500 text-white",
    chipClass:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
    dotClass: "bg-indigo-500",
    emoji: "💳",
    fallbackImage: UNS("1556742049-0cfed4f6a45d"),
  },
  entertainment: {
    value: "entertainment",
    label: "Entertainment",
    short: "Fun",
    badgeClass: "bg-rose-500 text-white",
    chipClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
    dotClass: "bg-rose-500",
    emoji: "🎬",
    fallbackImage: UNS("1489599849927-2ee91cede3ba"),
  },
  lifestyle: {
    value: "lifestyle",
    label: "Lifestyle",
    short: "Lifestyle",
    badgeClass: "bg-teal-500 text-white",
    chipClass:
      "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
    dotClass: "bg-teal-500",
    emoji: "🌿",
    fallbackImage: UNS("1571019613454-1cb2f99b2d8b"),
  },
};

export const CATEGORIES: CategoryMeta[] = Object.values(CATEGORY_META);

export function getCategoryMeta(category: PromoCategory): CategoryMeta {
  return CATEGORY_META[category];
}

/**
 * User-selectable interests → the categories they map to. Used for the
 * personalized "Recommended For You" ranking. Stored as keys in
 * `user_preferences.interests`.
 */
export interface InterestMeta {
  key: string;
  label: string;
  emoji: string;
  categories: PromoCategory[];
}

export const INTERESTS: InterestMeta[] = [
  { key: "food", label: "Food", emoji: "🍜", categories: ["food_beverage"] },
  { key: "cafes", label: "Cafes", emoji: "☕", categories: ["food_beverage"] },
  { key: "buffets", label: "Buffets", emoji: "🍽️", categories: ["food_beverage"] },
  { key: "shopping", label: "Shopping", emoji: "🛍️", categories: ["shopping"] },
  { key: "electronics", label: "Electronics", emoji: "🎧", categories: ["shopping"] },
  { key: "travel", label: "Travel", emoji: "✈️", categories: ["travel"] },
  { key: "family", label: "Family Activities", emoji: "👨‍👩‍👧", categories: ["attractions", "events", "lifestyle"] },
  { key: "entertainment", label: "Entertainment", emoji: "🎬", categories: ["entertainment"] },
];

/** Resolve a set of interest keys to the union of their categories. */
export function categoriesForInterests(keys: string[]): PromoCategory[] {
  const set = new Set<PromoCategory>();
  for (const k of keys) {
    const meta = INTERESTS.find((i) => i.key === k);
    meta?.categories.forEach((c) => set.add(c));
  }
  return [...set];
}

export const APP_NAME = "PromoSG";
export const APP_DESCRIPTION =
  "Discover Singapore promotions, deals and events on a clean calendar.";

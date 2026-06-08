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
}

/**
 * Single source of truth for category presentation. Used by calendar chips,
 * badges, legends and filters so colors stay consistent everywhere.
 */
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
  },
};

export const CATEGORIES: CategoryMeta[] = Object.values(CATEGORY_META);

export function getCategoryMeta(category: PromoCategory): CategoryMeta {
  return CATEGORY_META[category];
}

export const APP_NAME = "PromoSG";
export const APP_DESCRIPTION =
  "Discover Singapore promotions, deals and events on a clean calendar.";

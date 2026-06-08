import type { Promotion } from "@/lib/types";
import { promotionActiveOn, toDateKey } from "@/lib/calendar/date";

export interface DayBucket {
  /** YYYY-MM-DD key. */
  key: string;
  date: Date;
  promotions: Promotion[];
}

/**
 * Buckets promotions onto each day in `days`. A promotion appears on every day
 * within its [startDate, endDate] interval, so multi-day promos span cells.
 * Returns a Map keyed by date for O(1) lookup in the calendar grid.
 */
export function groupPromotionsByDay(
  promotions: Promotion[],
  days: Date[],
): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>();

  for (const date of days) {
    buckets.set(toDateKey(date), { key: toDateKey(date), date, promotions: [] });
  }

  for (const promo of promotions) {
    for (const date of days) {
      if (promotionActiveOn(promo, date)) {
        buckets.get(toDateKey(date))!.promotions.push(promo);
      }
    }
  }

  return buckets;
}

/** Count of active promotions on a given day. */
export function countByDay(
  promotions: Promotion[],
  days: Date[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const grouped = groupPromotionsByDay(promotions, days);
  for (const [key, bucket] of grouped) {
    counts.set(key, bucket.promotions.length);
  }
  return counts;
}

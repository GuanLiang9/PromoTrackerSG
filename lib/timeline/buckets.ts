import type { Promotion } from "@/lib/types";

export interface TimelineBucket {
  label: string;
  promotions: Promotion[];
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Days from today to the promo's "effective" date (running now = today). */
function dayOffset(promo: Promotion, todayMs: number): number {
  const start = new Date(promo.startDate + "T00:00:00").getTime();
  const effective = Math.max(start, todayMs);
  return Math.round((effective - todayMs) / 86_400_000);
}

/**
 * Group upcoming/running promotions into Today / Tomorrow / This Week /
 * Next Week / Later buckets. Empty buckets are omitted.
 */
export function bucketTimeline(promotions: Promotion[]): TimelineBucket[] {
  const today = startOfToday();
  const buckets: Record<string, Promotion[]> = {
    Today: [],
    Tomorrow: [],
    "This Week": [],
    "Next Week": [],
    Later: [],
  };

  for (const p of promotions) {
    const d = dayOffset(p, today);
    if (d <= 0) buckets["Today"].push(p);
    else if (d === 1) buckets["Tomorrow"].push(p);
    else if (d <= 6) buckets["This Week"].push(p);
    else if (d <= 13) buckets["Next Week"].push(p);
    else buckets["Later"].push(p);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, promotions: list }));
}

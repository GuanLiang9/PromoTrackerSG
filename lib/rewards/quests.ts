import { sgDateKey, sgToday, addDays } from "@/lib/rewards/sg-date";
import type { CheckInStatRow } from "@/lib/rewards/compute";

export interface Quest {
  id: string;
  emoji: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  /** Cosmetic reward shown to the user. */
  reward: string;
}

/** Monday (YYYY-MM-DD) of the Singapore week containing `dayKey`. */
function weekStart(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const back = dow === 0 ? 6 : dow - 1; // days since Monday
  return addDays(dayKey, -back);
}

/**
 * Rotating weekly quests, computed from the user's check-in rows for the current
 * Singapore week. Pure + deterministic — no storage. Completed quests grant a
 * cosmetic badge of honour on the profile/rewards screen.
 */
export function computeWeeklyQuests(rows: CheckInStatRow[]): Quest[] {
  const start = weekStart(sgToday());
  const week = rows.filter((r) => sgDateKey(r.created_at) >= start);

  const days = new Set<string>();
  const cuisines = new Set<string>();
  const areas = new Set<string>();
  let ratings = 0;
  for (const r of week) {
    days.add(sgDateKey(r.created_at));
    if (r.cuisine?.trim()) cuisines.add(r.cuisine.trim().toLowerCase());
    areas.add(r.area?.trim().toLowerCase() || "singapore");
    if (r.rating != null) ratings++;
  }

  const make = (
    id: string,
    emoji: string,
    title: string,
    description: string,
    current: number,
    target: number,
    reward: string,
  ): Quest => ({
    id,
    emoji,
    title,
    description,
    target,
    current: Math.min(current, target),
    completed: current >= target,
    reward,
  });

  return [
    make("week-streak", "🔥", "Streak keeper", "Check in on 5 days this week", days.size, 5, "+50 pts vibe"),
    make("week-cuisines", "🍱", "Flavour tour", "Try 3 different cuisines this week", cuisines.size, 3, "Adventurous flair"),
    make("week-areas", "🧭", "Neighbourhood hop", "Check in across 3 areas this week", areas.size, 3, "Explorer flair"),
    make("week-critic", "🌟", "Honest critic", "Rate 3 spots this week", ratings, 3, "Critic flair"),
  ];
}

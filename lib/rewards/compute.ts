import { sgDateKey, sgToday, addDays } from "@/lib/rewards/sg-date";
import { levelFor, nextLevel, levelProgressPct, type Level } from "@/lib/rewards/levels";

/** Minimal check-in fields needed to compute rewards. */
export interface CheckInStatRow {
  created_at: string;
  venue_name: string;
  area: string | null;
  cuisine: string | null;
  rating: number | null;
}

export interface RewardStats {
  checkIns: number;
  venues: number;
  days: number;
  areas: number;
  cuisines: number;
  ratings: number;
  maxAtOneVenue: number;
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  /** Oldest → newest: whether the user checked in on each of the last 7 SG days. */
  last7: boolean[];
  points: number;
  level: Level;
  next: Level | null;
  progressPct: number;
}

/** Longest run of consecutive days within a set of YYYY-MM-DD keys. */
function longestRun(daySet: Set<string>): number {
  let best = 0;
  for (const day of daySet) {
    // Only start counting from the beginning of a run.
    if (daySet.has(addDays(day, -1))) continue;
    let len = 1;
    let cur = day;
    while (daySet.has(addDays(cur, 1))) {
      cur = addDays(cur, 1);
      len++;
    }
    best = Math.max(best, len);
  }
  return best;
}

/** Streak ending today (or yesterday — still "alive", just at risk). */
function currentRun(daySet: Set<string>, today: string): number {
  let anchor: string | null = null;
  if (daySet.has(today)) anchor = today;
  else if (daySet.has(addDays(today, -1))) anchor = addDays(today, -1);
  if (!anchor) return 0;
  let len = 1;
  let cur = anchor;
  while (daySet.has(addDays(cur, -1))) {
    cur = addDays(cur, -1);
    len++;
  }
  return len;
}

export function computeStats(rows: CheckInStatRow[]): RewardStats {
  const dayKeys = rows.map((r) => sgDateKey(r.created_at));
  const daySet = new Set(dayKeys);
  const today = sgToday();

  const venueCounts = new Map<string, number>();
  const areas = new Set<string>();
  const cuisines = new Set<string>();
  let ratings = 0;
  for (const r of rows) {
    const v = r.venue_name.trim().toLowerCase();
    venueCounts.set(v, (venueCounts.get(v) ?? 0) + 1);
    areas.add((r.area?.trim().toLowerCase() || "singapore"));
    if (r.cuisine?.trim()) cuisines.add(r.cuisine.trim().toLowerCase());
    if (r.rating != null) ratings++;
  }

  const checkIns = rows.length;
  const venues = venueCounts.size;
  const days = daySet.size;
  const maxAtOneVenue = venueCounts.size ? Math.max(...venueCounts.values()) : 0;

  // Keep this formula identical to user_check_in_stats.points (migration 0008).
  const points = checkIns * 10 + venues * 15 + days * 5;

  const last7 = Array.from({ length: 7 }, (_, i) =>
    daySet.has(addDays(today, -(6 - i))),
  );

  return {
    checkIns,
    venues,
    days,
    areas: areas.size,
    cuisines: cuisines.size,
    ratings,
    maxAtOneVenue,
    currentStreak: currentRun(daySet, today),
    longestStreak: longestRun(daySet),
    checkedInToday: daySet.has(today),
    last7,
    points,
    level: levelFor(points),
    next: nextLevel(points),
    progressPct: levelProgressPct(points),
  };
}

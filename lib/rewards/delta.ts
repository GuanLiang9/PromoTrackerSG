import type { RewardStats } from "@/lib/rewards/compute";
import { BADGES } from "@/lib/rewards/badges";
import type { Level } from "@/lib/rewards/levels";

export interface CelebratedBadge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

/** What changed for the user as a result of a single check-in. */
export interface RewardDelta {
  pointsGained: number;
  /** Badges crossed for the first time on this check-in. */
  newBadges: CelebratedBadge[];
  /** New level if the user leveled up, else null. */
  leveledUpTo: Level | null;
  /** Streak milestone reached (3/7/30/100), else null. */
  streakMilestone: number | null;
}

const STREAK_MILESTONES = [3, 7, 30, 100];

const earnedIds = (s: RewardStats): Set<string> =>
  new Set(BADGES.filter((b) => b.earned(s)).map((b) => b.id));

/**
 * Diff two stat snapshots (before/after one check-in) plus the badges already
 * persisted, to produce the celebration payload and the badge ids to persist.
 */
export function computeRewardDelta(
  prev: RewardStats,
  next: RewardStats,
  persisted: Set<string>,
): { delta: RewardDelta; badgeIdsToInsert: string[] } {
  const before = earnedIds(prev);
  const nowEarned = earnedIds(next);

  // Persist any earned badge not yet recorded (keeps the table accurate).
  const badgeIdsToInsert = [...nowEarned].filter((id) => !persisted.has(id));

  // Only celebrate badges crossed THIS check-in (and not already persisted),
  // so pre-existing users don't get a backfill flood.
  const newBadges: CelebratedBadge[] = BADGES.filter(
    (b) => nowEarned.has(b.id) && !before.has(b.id) && !persisted.has(b.id),
  ).map((b) => ({ id: b.id, emoji: b.emoji, label: b.label, description: b.description }));

  const leveledUpTo = next.level.name !== prev.level.name ? next.level : null;

  let streakMilestone: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (next.currentStreak >= m && prev.currentStreak < m) streakMilestone = m;
  }

  return {
    delta: {
      pointsGained: next.points - prev.points,
      newBadges,
      leveledUpTo,
      streakMilestone,
    },
    badgeIdsToInsert,
  };
}

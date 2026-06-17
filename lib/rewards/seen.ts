// Tracks which rewards a user has already SEEN (per device, via localStorage) so
// the top-bar trophy can badge only genuinely-new achievements and clear them
// when the user opens /rewards. Client-only.
import { BADGES } from "@/lib/rewards/badges";
import type { RewardStats } from "@/lib/rewards/compute";

const STREAK_MILESTONES = [3, 7, 30, 100];

export interface RewardSignature {
  badges: string[]; // earned badge ids (sorted, stable)
  level: string; // current level name
  milestone: number; // highest streak milestone reached (0 = none)
}

export function signatureOf(stats: RewardStats): RewardSignature {
  return {
    badges: BADGES.filter((b) => b.earned(stats)).map((b) => b.id).sort(),
    level: stats.level.name,
    milestone: STREAK_MILESTONES.filter((m) => stats.longestStreak >= m).pop() ?? 0,
  };
}

const keyFor = (userId: string) => `promosg:rewards-seen:${userId}`;

export function getAcknowledged(userId: string): RewardSignature | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as RewardSignature) : null;
  } catch {
    return null;
  }
}

export function acknowledge(userId: string, stats: RewardStats): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(signatureOf(stats)));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** How many new (unseen) achievements there are versus the acknowledged signature. */
export function countUnseen(ack: RewardSignature, stats: RewardStats): number {
  const cur = signatureOf(stats);
  const seen = new Set(ack.badges);
  let n = cur.badges.filter((b) => !seen.has(b)).length;
  if (cur.level !== ack.level) n += 1;
  if (cur.milestone > ack.milestone) n += 1;
  return n;
}

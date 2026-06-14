import type { RewardStats } from "@/lib/rewards/compute";

/** A Swarm-style sticker unlocked by hitting a milestone. */
export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: (s: RewardStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first-bite",     emoji: "🎉", label: "First Bite",     description: "Your first check-in",              earned: (s) => s.checkIns >= 1 },
  { id: "getting-around", emoji: "🍽️", label: "Getting Around", description: "5 check-ins",                       earned: (s) => s.checkIns >= 5 },
  { id: "centurion",      emoji: "💯", label: "Centurion",      description: "100 check-ins",                     earned: (s) => s.checkIns >= 100 },
  { id: "on-a-roll",      emoji: "🔥", label: "On a Roll",      description: "3-day streak",                      earned: (s) => s.longestStreak >= 3 },
  { id: "week-warrior",   emoji: "⚡", label: "Week Warrior",   description: "7-day streak",                      earned: (s) => s.longestStreak >= 7 },
  { id: "unstoppable",    emoji: "🏆", label: "Unstoppable",    description: "30-day streak",                     earned: (s) => s.longestStreak >= 30 },
  { id: "explorer",       emoji: "🧭", label: "Explorer",       description: "Checked in across 5 areas",         earned: (s) => s.areas >= 5 },
  { id: "island-hopper",  emoji: "🌏", label: "Island Hopper",  description: "Checked in across 10 areas",        earned: (s) => s.areas >= 10 },
  { id: "adventurous",    emoji: "🍱", label: "Adventurous",    description: "Tried 5 different cuisines",        earned: (s) => s.cuisines >= 5 },
  { id: "critic",         emoji: "🌟", label: "Critic",         description: "Rated 10 spots",                    earned: (s) => s.ratings >= 10 },
  { id: "regular-here",   emoji: "📍", label: "Regular Here",   description: "5 check-ins at one venue",          earned: (s) => s.maxAtOneVenue >= 5 },
];

export interface EvaluatedBadge extends Badge {
  unlocked: boolean;
}

export function evaluateBadges(s: RewardStats): EvaluatedBadge[] {
  return BADGES.map((b) => ({ ...b, unlocked: b.earned(s) }));
}

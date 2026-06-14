/** Food-explorer levels keyed off total points. Ordered low → high. */
export interface Level {
  name: string;
  emoji: string;
  min: number;
}

export const LEVELS: Level[] = [
  { name: "Newbie", emoji: "🌱", min: 0 },
  { name: "Foodie", emoji: "🍜", min: 100 },
  { name: "Regular", emoji: "🍢", min: 300 },
  { name: "Explorer", emoji: "🧭", min: 600 },
  { name: "Connoisseur", emoji: "⭐", min: 1200 },
  { name: "Legend", emoji: "👑", min: 2500 },
];

/** The highest level whose threshold the points meet. */
export function levelFor(points: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) current = l;
  return current;
}

/** The next level up, or null when already at the top. */
export function nextLevel(points: number): Level | null {
  return LEVELS.find((l) => l.min > points) ?? null;
}

/** 0–100 progress from the current level's floor to the next level's floor. */
export function levelProgressPct(points: number): number {
  const cur = levelFor(points);
  const nxt = nextLevel(points);
  if (!nxt) return 100;
  return Math.round(((points - cur.min) / (nxt.min - cur.min)) * 100);
}

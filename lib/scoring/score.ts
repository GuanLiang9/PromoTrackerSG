/**
 * Worth-Going Score — a deterministic 0-100 rating. No LLM: free, instant,
 * consistent. The base score is precomputed daily and stored on the promotion;
 * a personalized delta (interests, distance, engagement) is applied per request.
 */

export type ScoreLevel =
  | "Must Grab"
  | "Highly Recommended"
  | "Worth Considering"
  | "Average"
  | "Low Priority";

export interface ScoreResult {
  score: number;
  reasons: string[];
}

export interface BaseScoreInput {
  discountPct: number | null;
  savingsAmount: number | null;
  savedCount: number;
  endDate: string; // ISO YYYY-MM-DD
  text: string; // title + description + tags, lowercased ok
}

const RARITY_RE =
  /\b(limited|exclusive|while stocks last|today only|flash|one day|members only|rare|first \d+)\b/i;

function daysUntil(iso: string): number {
  const end = new Date(iso + "T23:59:59");
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

/** Money saved (S$) → reason string. */
function moneyReason(amount: number): string {
  return `Save approximately S$${Math.round(amount)}`;
}

/**
 * Compute the deterministic base score from intrinsic promotion data.
 * Factors: discount %, savings amount, popularity, rarity, time remaining.
 */
export function computeBaseScore(input: BaseScoreInput): ScoreResult {
  const reasons: string[] = [];
  let score = 30; // baseline

  // Discount percentage (max +25)
  if (input.discountPct != null) {
    score += Math.min(25, Math.round((input.discountPct / 100) * 30));
    if (input.discountPct >= 50) reasons.push(`${input.discountPct}% off — big discount`);
    else if (input.discountPct >= 20) reasons.push(`${input.discountPct}% off`);
  }

  // Savings amount (max +20)
  if (input.savingsAmount != null && input.savingsAmount > 0) {
    score += Math.min(20, Math.round(input.savingsAmount / 5));
    reasons.push(moneyReason(input.savingsAmount));
  }

  // Popularity from saves (max +15)
  if (input.savedCount > 0) {
    score += Math.min(15, input.savedCount * 3);
    if (input.savedCount >= 5) reasons.push("Popular among users");
  }

  // Rarity / urgency keywords (+10)
  if (RARITY_RE.test(input.text)) {
    score += 10;
    reasons.push("Limited-time offer");
  }

  // Time remaining (max +10; ending soon is more urgent/worth grabbing now)
  const left = daysUntil(input.endDate);
  if (left >= 0 && left <= 2) {
    score += 10;
    reasons.push(left <= 0 ? "Ends today" : left === 1 ? "Ends tomorrow" : `Ends in ${left} days`);
  } else if (left <= 7) {
    score += 5;
    reasons.push(`Ends in ${left} days`);
  }

  return { score: clamp(score), reasons: reasons.slice(0, 5) };
}

export interface PersonalizeInput {
  interests?: string[]; // category values the user cares about
  category?: string;
  distanceKm?: number | null;
  engagedCategories?: Set<string>; // from click/save history
}

/** Apply per-user adjustments to a stored base score. */
export function personalizeScore(
  base: number,
  reasons: string[],
  p: PersonalizeInput,
): ScoreResult {
  let score = base;
  const out = [...reasons];

  if (p.category && p.interests?.includes(p.category)) {
    score += 8;
    out.unshift("Matches your interests");
  }
  if (p.category && p.engagedCategories?.has(p.category)) {
    score += 5;
  }
  if (p.distanceKm != null) {
    if (p.distanceKm <= 1) {
      score += 8;
      out.unshift(`${Math.round(p.distanceKm * 1000)} m away`);
    } else if (p.distanceKm <= 5) {
      score += 4;
      out.unshift(`${p.distanceKm.toFixed(1)} km away`);
    }
  }

  return { score: clamp(score), reasons: out.slice(0, 5) };
}

export function scoreLevel(n: number): ScoreLevel {
  if (n >= 90) return "Must Grab";
  if (n >= 75) return "Highly Recommended";
  if (n >= 60) return "Worth Considering";
  if (n >= 40) return "Average";
  return "Low Priority";
}

/** Tailwind classes for a score level chip. */
export function scoreLevelClass(n: number): string {
  if (n >= 90) return "bg-emerald-500 text-white";
  if (n >= 75) return "bg-emerald-100 text-emerald-800";
  if (n >= 60) return "bg-amber-100 text-amber-800";
  if (n >= 40) return "bg-zinc-100 text-zinc-700";
  return "bg-zinc-100 text-zinc-500";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

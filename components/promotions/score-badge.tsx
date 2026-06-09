import { scoreLevel, scoreLevelClass } from "@/lib/scoring/score";
import { cn } from "@/lib/utils";

/** Compact 🔥 92 chip for cards. */
export function ScoreChip({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
        scoreLevelClass(score),
        className,
      )}
      title={`Worth Going Score: ${score}/100 — ${scoreLevel(score)}`}
    >
      🔥 {score}
    </span>
  );
}

/** Full score panel with level + reasons, for the detail page. */
export function ScorePanel({
  score,
  reasons,
}: {
  score: number | null;
  reasons: string[];
}) {
  if (score == null) return null;
  const level = scoreLevel(score);
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm text-muted-foreground">Worth Going Score</p>
            <p className="text-2xl font-bold leading-none">
              {score}
              <span className="text-base font-medium text-muted-foreground">/100</span>
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            scoreLevelClass(score),
          )}
        >
          {level}
        </span>
      </div>

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-500">✓</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

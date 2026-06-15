import { evaluateBadges } from "@/lib/rewards/badges";
import { cn } from "@/lib/utils";
import type { RewardStats } from "@/lib/rewards/compute";

export function BadgesGrid({ stats }: { stats: RewardStats }) {
  const badges = evaluateBadges(stats);
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Badges</h2>
        <span className="text-xs text-muted-foreground">
          {unlocked}/{badges.length} unlocked
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.description}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all",
              b.unlocked ? "bg-card" : "bg-muted/30 opacity-50 grayscale",
            )}
          >
            <span className="text-2xl">{b.emoji}</span>
            <span className="text-[11px] font-semibold leading-tight">{b.label}</span>
            <span className="text-[9px] leading-tight text-muted-foreground">{b.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

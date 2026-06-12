import { SearchX } from "lucide-react";
import { PromoCard } from "@/components/promotions/promo-card";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-14 text-center">
      <span className="text-4xl">🔍</span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground/70">{message}</p>
        <p className="text-xs text-muted-foreground">Check back soon — new deals added weekly.</p>
      </div>
    </div>
  );
}

export function PromoGrid({
  promotions,
  empty = "No promotions found.",
}: {
  promotions: Promotion[];
  empty?: string;
}) {
  if (promotions.length === 0) {
    return <EmptyState message={empty} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((p, i) => (
        <div
          key={p.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
        >
          <PromoCard promotion={p} />
        </div>
      ))}
    </div>
  );
}

/** Horizontally-scrolling row used for dashboard sections. */
export function PromoRow({
  promotions,
  className,
}: {
  promotions: Promotion[];
  className?: string;
}) {
  if (promotions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground/60">
        Nothing here yet — deals update weekly.
      </p>
    );
  }
  return (
    <div
      className={cn(
        "no-scrollbar -mx-4 flex items-stretch snap-x gap-3 overflow-x-auto px-4 pb-2",
        className,
      )}
    >
      {promotions.map((p, i) => (
        <div
          key={p.id}
          className="flex w-[17rem] shrink-0 snap-start animate-fade-in-up"
          style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
        >
          <PromoCard promotion={p} />
        </div>
      ))}
    </div>
  );
}

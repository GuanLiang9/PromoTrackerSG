import { PromoCard } from "@/components/promotions/promo-card";
import type { Promotion } from "@/lib/types";

export function PromoGrid({
  promotions,
  empty = "No promotions found.",
}: {
  promotions: Promotion[];
  empty?: string;
}) {
  if (promotions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((p) => (
        <PromoCard key={p.id} promotion={p} />
      ))}
    </div>
  );
}

/** Horizontally-scrolling row used for dashboard sections on mobile. */
export function PromoRow({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing here yet.</p>
    );
  }
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {promotions.map((p) => (
        <div key={p.id} className="w-64 shrink-0 snap-start">
          <PromoCard promotion={p} />
        </div>
      ))}
    </div>
  );
}

import { SearchX, Inbox } from "lucide-react";
import { PromoCard } from "@/components/promotions/promo-card";
import type { Promotion } from "@/lib/types";

function EmptyState({ message, icon: Icon }: { message: string; icon: typeof Inbox }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">{message}</p>
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
    return <EmptyState message={empty} icon={SearchX} />;
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
      <p className="text-sm text-muted-foreground/60">Nothing here yet.</p>
    );
  }
  return (
    <div className="no-scrollbar -mx-4 flex items-stretch snap-x gap-3 overflow-x-auto px-4 pb-1">
      {promotions.map((p) => (
        <div key={p.id} className="flex w-64 shrink-0 snap-start">
          <PromoCard promotion={p} />
        </div>
      ))}
    </div>
  );
}

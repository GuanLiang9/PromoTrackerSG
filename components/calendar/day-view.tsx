"use client";

import { format } from "date-fns";
import { PromoCard } from "@/components/promotions/promo-card";
import { promotionActiveOn } from "@/lib/calendar/date";
import type { Promotion } from "@/lib/types";

export function DayView({
  date,
  promotions,
}: {
  date: Date;
  promotions: Promotion[];
}) {
  const dayPromos = promotions.filter((p) => promotionActiveOn(p, date));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-bold">{format(date, "EEEE")}</h2>
        <span className="text-muted-foreground">
          {format(date, "d MMMM yyyy")}
        </span>
        <span className="ml-auto text-sm text-muted-foreground">
          {dayPromos.length} active
        </span>
      </div>

      {dayPromos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No active promotions on this day.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dayPromos.map((p) => (
            <PromoCard key={p.id} promotion={p} />
          ))}
        </div>
      )}
    </div>
  );
}

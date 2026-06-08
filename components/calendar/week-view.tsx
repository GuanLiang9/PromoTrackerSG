"use client";

import { format, isToday } from "date-fns";
import { PromoChip } from "@/components/calendar/promo-chip";
import { groupPromotionsByDay } from "@/lib/calendar/group";
import { toDateKey } from "@/lib/calendar/date";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

export function WeekView({
  days,
  promotions,
  onSelectDay,
}: {
  days: Date[];
  promotions: Promotion[];
  onSelectDay: (date: Date) => void;
}) {
  const buckets = groupPromotionsByDay(promotions, days);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((date) => {
        const dayPromos = buckets.get(toDateKey(date))?.promotions ?? [];
        return (
          <button
            key={toDateKey(date)}
            type="button"
            onClick={() => onSelectDay(date)}
            className="flex min-h-[8rem] flex-col gap-1 rounded-xl border p-2 text-left transition-colors hover:bg-accent/60"
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {format(date, "EEE")}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isToday(date) && "bg-primary text-primary-foreground",
                )}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {dayPromos.slice(0, 5).map((p) => (
                <PromoChip key={p.id} promotion={p} />
              ))}
              {dayPromos.length > 5 && (
                <span className="text-[10px] text-muted-foreground">
                  +{dayPromos.length - 5} more
                </span>
              )}
              {dayPromos.length === 0 && (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

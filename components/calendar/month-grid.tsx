"use client";

import { DayCell } from "@/components/calendar/day-cell";
import { WEEKDAY_LABELS, toDateKey } from "@/lib/calendar/date";
import { groupPromotionsByDay } from "@/lib/calendar/group";
import type { Promotion } from "@/lib/types";

export function MonthGrid({
  days,
  focus,
  promotions,
  onSelectDay,
}: {
  days: Date[];
  focus: Date;
  promotions: Promotion[];
  onSelectDay: (date: Date) => void;
}) {
  const buckets = groupPromotionsByDay(promotions, days);

  return (
    <div className="overflow-hidden rounded-xl border border-l-0 border-t-0">
      <div className="grid grid-cols-7 border-l border-t bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b border-r py-2 text-center text-xs font-semibold text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l">
        {days.map((date) => (
          <DayCell
            key={toDateKey(date)}
            date={date}
            monthFocus={focus}
            promotions={buckets.get(toDateKey(date))?.promotions ?? []}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { isSameMonth, isToday } from "date-fns";
import { CategoryDot } from "@/components/promotions/category-badge";
import { PromoChip } from "@/components/calendar/promo-chip";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

const MAX_CHIPS = 3;

/** A single day in the month grid (Apple-Calendar style). */
export function DayCell({
  date,
  monthFocus,
  promotions,
  onSelect,
}: {
  date: Date;
  monthFocus: Date;
  promotions: Promotion[];
  onSelect: (date: Date) => void;
}) {
  const outside = !isSameMonth(date, monthFocus);
  const today = isToday(date);
  const extra = promotions.length - MAX_CHIPS;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cn(
        "flex min-h-[4.5rem] flex-col gap-1 border-b border-r p-1 text-left transition-colors hover:bg-accent/60 sm:min-h-[6.5rem]",
        outside && "bg-muted/30 text-muted-foreground",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            today && "bg-primary text-primary-foreground",
          )}
        >
          {date.getDate()}
        </span>
        {promotions.length > 0 && (
          <span className="text-[10px] font-semibold text-muted-foreground">
            {promotions.length}
          </span>
        )}
      </div>

      {/* Mobile: colored dots. Desktop: title chips. */}
      <div className="flex flex-wrap gap-0.5 sm:hidden">
        {promotions.slice(0, 4).map((p) => (
          <CategoryDot key={p.id} category={p.category} />
        ))}
      </div>
      <div className="hidden flex-col gap-0.5 sm:flex">
        {promotions.slice(0, MAX_CHIPS).map((p) => (
          <PromoChip key={p.id} promotion={p} />
        ))}
        {extra > 0 && (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{extra} more
          </span>
        )}
      </div>
    </button>
  );
}

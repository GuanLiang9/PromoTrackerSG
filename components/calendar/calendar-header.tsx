"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarView } from "@/lib/types";

function title(view: CalendarView, focus: Date, rangeStart: Date, rangeEnd: Date) {
  if (view === "month") return format(focus, "MMMM yyyy");
  if (view === "day") return format(focus, "d MMM yyyy");
  // week
  const sameMonth = rangeStart.getMonth() === rangeEnd.getMonth();
  return sameMonth
    ? `${format(rangeStart, "d")} – ${format(rangeEnd, "d MMM yyyy")}`
    : `${format(rangeStart, "d MMM")} – ${format(rangeEnd, "d MMM yyyy")}`;
}

export function CalendarHeader({
  view,
  focus,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: {
  view: CalendarView;
  focus: Date;
  rangeStart: Date;
  rangeEnd: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
        <h1 className="ml-1 text-lg font-bold sm:text-xl">
          {title(view, focus, rangeStart, rangeEnd)}
        </h1>
      </div>

      <Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

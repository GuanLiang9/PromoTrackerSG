"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, addWeeks } from "date-fns";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { DayPromotionsDialog } from "@/components/calendar/day-promotions-dialog";
import { CalendarLegend } from "@/components/calendar/legend";
import {
  getCalendarRange,
  getRangeBounds,
  toDateKey,
} from "@/lib/calendar/date";
import { parseISO } from "date-fns";
import type { CalendarView, Promotion } from "@/lib/types";

/**
 * Interactive shell for the calendar. View + focused date live in the URL so
 * the server can fetch exactly the promotions for the visible range; this
 * client component handles in-view interactions (day selection dialog).
 */
export function CalendarRoot({
  view,
  focusISO,
  promotions,
}: {
  view: CalendarView;
  focusISO: string;
  promotions: Promotion[];
}) {
  const router = useRouter();
  const focus = React.useMemo(() => parseISO(focusISO), [focusISO]);
  const days = React.useMemo(
    () => getCalendarRange(view, focus),
    [view, focus],
  );
  const { start, end } = React.useMemo(
    () => getRangeBounds(view, focus),
    [view, focus],
  );

  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  function navigate(nextView: CalendarView, nextFocus: Date) {
    const params = new URLSearchParams({
      view: nextView,
      date: toDateKey(nextFocus),
    });
    router.push(`/calendar?${params.toString()}`);
  }

  const step = (dir: 1 | -1) => {
    const fn =
      view === "month" ? addMonths : view === "week" ? addWeeks : addDays;
    navigate(view, fn(focus, dir));
  };

  const onSelectDay = (date: Date) => {
    setSelectedDay(date);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        view={view}
        focus={focus}
        rangeStart={days[0]}
        rangeEnd={days[days.length - 1]}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => navigate(view, new Date())}
        onViewChange={(v) => navigate(v, focus)}
      />

      {view === "month" && (
        <MonthGrid
          days={days}
          focus={focus}
          promotions={promotions}
          onSelectDay={onSelectDay}
        />
      )}
      {view === "week" && (
        <WeekView days={days} promotions={promotions} onSelectDay={onSelectDay} />
      )}
      {view === "day" && <DayView date={focus} promotions={promotions} />}

      {view !== "day" && <CalendarLegend className="pt-1" />}

      {/* `start`/`end` document the fetched window for clarity. */}
      <span className="sr-only">
        Showing {toDateKey(start)} to {toDateKey(end)}
      </span>

      <DayPromotionsDialog
        date={selectedDay}
        promotions={promotions}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarView } from "@/lib/types";

/** Singapore weeks start on Monday. */
const WEEK_OPTS = { weekStartsOn: 1 as const };

/** ISO date string (YYYY-MM-DD) in local time, used as a stable day key. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(key: string): Date {
  return startOfDay(parseISO(key));
}

/**
 * The full list of days to render for a given view + focused date. Month view
 * is padded to whole weeks so the grid is always rectangular (Apple Calendar
 * style).
 */
export function getCalendarRange(view: CalendarView, focus: Date): Date[] {
  switch (view) {
    case "month": {
      const gridStart = startOfWeek(startOfMonth(focus), WEEK_OPTS);
      const gridEnd = endOfWeek(endOfMonth(focus), WEEK_OPTS);
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }
    case "week": {
      const start = startOfWeek(focus, WEEK_OPTS);
      return eachDayOfInterval({ start, end: endOfWeek(focus, WEEK_OPTS) });
    }
    case "day":
      return [startOfDay(focus)];
  }
}

/** The inclusive [start, end] dates covering the rendered range. */
export function getRangeBounds(view: CalendarView, focus: Date): {
  start: Date;
  end: Date;
} {
  const days = getCalendarRange(view, focus);
  return { start: days[0], end: addDays(days[days.length - 1], 1) };
}

/** Whether a promotion's [start, end] interval includes the given day. */
export function promotionActiveOn(
  promo: { startDate: string; endDate: string },
  day: Date,
): boolean {
  const start = startOfDay(parseISO(promo.startDate));
  const end = startOfDay(parseISO(promo.endDate));
  return isWithinInterval(startOfDay(day), { start, end });
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export { format, WEEK_OPTS };

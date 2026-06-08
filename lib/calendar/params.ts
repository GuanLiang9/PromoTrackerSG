import type { CalendarView } from "@/lib/types";
import { parseISO, isValid } from "date-fns";

const VIEWS: CalendarView[] = ["month", "week", "day"];

export function parseView(value: string | undefined | null): CalendarView {
  return value && (VIEWS as string[]).includes(value)
    ? (value as CalendarView)
    : "month";
}

/** Parses a YYYY-MM-DD focus date, defaulting to today on invalid input. */
export function parseFocusDate(value: string | undefined | null): Date {
  if (value) {
    const parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
  }
  return new Date();
}

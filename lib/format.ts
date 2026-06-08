import { differenceInCalendarDays, format, parseISO } from "date-fns";

/** "12 Jun – 30 Jun 2026" or "12 Jun 2026" for single-day. */
export function formatDateRange(startISO: string, endISO: string): string {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (startISO === endISO) return format(start, "d MMM yyyy");
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = sameYear ? format(start, "d MMM") : format(start, "d MMM yyyy");
  return `${startFmt} – ${format(end, "d MMM yyyy")}`;
}

/** Human "ends in" label, or null if not ending soon / already ended. */
export function endingInLabel(endISO: string, now = new Date()): string | null {
  const days = differenceInCalendarDays(parseISO(endISO), now);
  if (days < 0) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 7) return `Ends in ${days} days`;
  return null;
}

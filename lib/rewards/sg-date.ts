/**
 * Singapore-local day helpers. SG is UTC+8 with no DST, so a "day" is simply the
 * Asia/Singapore calendar date of a timestamp. Used for streaks and the daily
 * check-in boundary so the rules feel right to local users regardless of the
 * server's timezone.
 */

/** YYYY-MM-DD for the given instant, in Asia/Singapore. */
export function sgDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

/** Today's YYYY-MM-DD in Asia/Singapore. */
export function sgToday(): string {
  return sgDateKey(new Date());
}

/** Add `n` days to a YYYY-MM-DD key (n may be negative). Pure date math. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

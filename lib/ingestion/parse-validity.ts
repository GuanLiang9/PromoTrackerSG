/**
 * Deterministic natural-language validity-date parser for SG promo posts.
 * Handles the messy date phrasings Telegram/RSS deals use, e.g.:
 *   "Validity: Now till 30 April 2024", "Till 7 June", "26 - 28 Mar 2024",
 *   "on 18 & 19 May 2026", "Until 22 May", "valid till 31 Dec".
 *
 * Returns ISO (YYYY-MM-DD) start/end plus `latest` (the furthest date found),
 * which the pipeline uses to decide whether a promo is already expired.
 * Free, no LLM — reused by the ingest extractor and the data-cleanup script.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_ALT = Object.keys(MONTHS).join("|");

// "30 April 2024", "7 June", "28th Mar 2024"
const DMY_RE = new RegExp(
  `\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\b\\.?\\s*(\\d{4})?`,
  "gi",
);
// "April 30 2024", "Jun 3, 2026", "May 18"
const MDY_RE = new RegExp(
  `\\b(${MONTH_ALT})\\b\\.?\\s+(\\d{1,2})\\s*(?:st|nd|rd|th)?,?\\s*(\\d{4})?`,
  "gi",
);
// ISO + slash formats
const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const DMY_SLASH_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;

export interface ParsedValidity {
  start: string | null;
  end: string | null;
  /** Furthest-out date mentioned anywhere in the text (used for expiry checks). */
  latest: string | null;
  /**
   * Date attached to a terminal-validity cue ("till/until/by/ends <date>").
   * More reliable than `latest` for expiry: a post may list other later dates
   * in its footer, but the cue date is the real deadline.
   */
  cueEnd: string | null;
  /** Whether any date carried an explicit 4-digit year (higher confidence). */
  hasExplicitYear: boolean;
}

// Terminal-validity cue words that immediately precede a deadline date.
const CUE_RE = /\b(?:till|until|til|thru|through|ends?|ending|expires?|valid(?:ity)?(?:\s*:?\s*now)?(?:\s*[-–—to]+)?|up\s*to|by)\b[\s:.–—-]*$/i;

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parse all dates from text. Dates without an explicit year are assumed to be
 * in `refYear` (the year the post was ingested / current year) — for promo
 * validity that's correct in practice and makes stale "till 7 June" posts
 * resolve as past.
 */
export function parseValidity(text: string, refYear: number): ParsedValidity {
  const found: { date: string; year: boolean }[] = [];
  const cueDates: string[] = [];
  const t = text || "";

  const push = (
    y: number | undefined,
    m: number,
    d: number,
    matchStart: number,
    matchEnd: number,
  ) => {
    const explicit = y != null;
    const date = iso(y ?? refYear, m, d);
    if (!date) return;
    found.push({ date, year: explicit });
    // Cue-anchored when a terminal-validity word sits just before the date.
    // ...but "Valid 10 Jun to 20 Jun" is a range: its first date is the START, not a deadline.
    const isRangeStart = /^\s*(?:to|until|till|–|—|-)\s*\d/i.test(t.slice(matchEnd, matchEnd + 12));
    if (!isRangeStart && CUE_RE.test(t.slice(Math.max(0, matchStart - 24), matchStart))) {
      cueDates.push(date);
    }
  };

  let mm: RegExpExecArray | null;

  DMY_RE.lastIndex = 0;
  while ((mm = DMY_RE.exec(t)) !== null) {
    push(mm[3] ? Number(mm[3]) : undefined, MONTHS[mm[2].toLowerCase()], Number(mm[1]), mm.index, mm.index + mm[0].length);
  }
  MDY_RE.lastIndex = 0;
  while ((mm = MDY_RE.exec(t)) !== null) {
    push(mm[3] ? Number(mm[3]) : undefined, MONTHS[mm[1].toLowerCase()], Number(mm[2]), mm.index, mm.index + mm[0].length);
  }
  ISO_RE.lastIndex = 0;
  while ((mm = ISO_RE.exec(t)) !== null) {
    push(Number(mm[1]), Number(mm[2]), Number(mm[3]), mm.index, mm.index + mm[0].length);
  }
  DMY_SLASH_RE.lastIndex = 0;
  while ((mm = DMY_SLASH_RE.exec(t)) !== null) {
    push(Number(mm[3]), Number(mm[2]), Number(mm[1]), mm.index, mm.index + mm[0].length);
  }

  if (found.length === 0) {
    return { start: null, end: null, latest: null, cueEnd: null, hasExplicitYear: false };
  }

  const dates = found.map((f) => f.date).sort();
  const hasExplicitYear = found.some((f) => f.year);
  // The earliest cue date is the binding deadline (a post may say
  // "till 7 June ... join @channel for deals till Dec" — the first is the offer).
  const cueEnd = cueDates.length ? cueDates.sort()[0] : null;

  return {
    start: dates[0],
    end: dates[dates.length - 1],
    latest: dates[dates.length - 1],
    cueEnd,
    hasExplicitYear,
  };
}

/**
 * True when the text's validity is clearly in the past relative to `today`
 * (ISO). Only fires when we actually found a date — undated posts return false.
 */
export function isExpiredByText(text: string, today: string): boolean {
  const refYear = Number(today.slice(0, 4));
  const { latest, cueEnd } = parseValidity(text, refYear);
  // A cue-anchored deadline in the past is authoritative even if the footer
  // mentions later dates. Otherwise fall back to "all dates are in the past".
  if (cueEnd != null) return cueEnd < today;
  return latest != null && latest < today;
}

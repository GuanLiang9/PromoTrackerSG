/**
 * Deterministic extraction of discount % and savings amount from promotion text.
 * Free, instant — no LLM. Used by the daily scoring pass.
 */

export interface ParsedSavings {
  discountPct: number | null;
  savingsAmount: number | null;
}

const PCT_RE = /(\d{1,2}(?:\.\d)?)\s*%\s*(?:off|discount|rebate|cashback)?/i;
const SAVE_RE = /(?:save|saving|savings|discount of|up to)\s*(?:s?\$|sgd)\s*(\d{1,4}(?:\.\d{1,2})?)/i;
const DOLLAR_OFF_RE = /(?:s?\$|sgd)\s*(\d{1,4}(?:\.\d{1,2})?)\s*(?:off|rebate|cashback|voucher)/i;
const ONE_FOR_ONE_RE = /\b1[\s-]?for[\s-]?1\b|\bbuy\s*1\s*(?:get|free)\s*1\b|\bbogo\b/i;

/** Parse a free-text blob (title + description + tags) into structured savings. */
export function parseSavings(text: string): ParsedSavings {
  const t = text || "";
  let discountPct: number | null = null;
  let savingsAmount: number | null = null;

  const pct = t.match(PCT_RE);
  if (pct) {
    const n = Number(pct[1]);
    if (n >= 1 && n <= 99) discountPct = n;
  }

  // 1-for-1 implies an effective ~50% discount.
  if (discountPct == null && ONE_FOR_ONE_RE.test(t)) discountPct = 50;

  const save = t.match(SAVE_RE) ?? t.match(DOLLAR_OFF_RE);
  if (save) {
    const n = Number(save[1]);
    if (n > 0 && n <= 9999) savingsAmount = n;
  }

  return { discountPct, savingsAmount };
}

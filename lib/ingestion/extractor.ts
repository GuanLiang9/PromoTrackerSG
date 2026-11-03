import type {
  ContentType,
  ExtractedPromotion,
  PromotionExtractor,
  RawItem,
} from "@/lib/ingestion/types";
import type { PromoCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/constants";
import { parseValidity, isExpiredByText } from "@/lib/ingestion/parse-validity";

const CATEGORY_KEYWORDS: Record<PromoCategory, string[]> = {
  food_beverage: ["food", "dining", "restaurant", "cafe", "buffet", "drink", "1-for-1", "bistro"],
  shopping: ["sale", "shopping", "mall", "outlet", "voucher", "% off", "discount", "bundle"],
  attractions: ["attraction", "zoo", "gardens", "sentosa", "museum", "theme park", "ticket"],
  events: ["event", "festival", "fair", "expo", "concert", "market", "pop-up"],
  travel: ["travel", "flight", "hotel", "staycation", "airline", "holiday", "getaway"],
  credit_card: ["credit card", "cashback", "card", "uob", "ocbc", "dbs", "citi", "amex", "miles"],
  entertainment: ["movie", "cinema", "gv", "cathay", "show", "theatre", "gaming"],
  lifestyle: ["spa", "wellness", "beauty", "fitness", "gym", "salon", "lifestyle"],
};

function guessCategory(text: string): PromoCategory {
  const lower = text.toLowerCase();
  let best: PromoCategory = "lifestyle";
  let bestScore = 0;
  for (const category of Object.keys(CATEGORY_KEYWORDS) as PromoCategory[]) {
    const score = CATEGORY_KEYWORDS[category].reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

function extractTags(text: string): string[] {
  const hashtags = (text.match(/#(\w+)/g) ?? []).map((t) =>
    t.slice(1).toLowerCase(),
  );
  return Array.from(new Set(hashtags)).slice(0, 8);
}

const DEAL_RE =
  /(\d+\s*-?\s*for\s*-?\s*\d+|1-?for-?1|\d+\s*%\s*off|%\s*off|\bfree\b|giving away|\bsale\b|discount|voucher|cashback|rebate|\bdeal\b|\bpromo\b|save\s+\$|bundle|clearance|special\s+price|\$\d+\s*(?:nett|only|deal)?)/i;
const EVENT_RE =
  /\b(festival|fiesta|carnival|bazaar|pop-?up|pasar malam|night market|expo|funfair|countdown|parade|street fair|fringe)\b/i;
const NEWS_RE =
  /\b(opens?|opening|now open|reopens?|launch(?:es|ed|ing)?|unveil(?:s|ed)?|introduc(?:e|es|ed|ing)|debuts?|closing|closes?|shuts? down|review|guide|directory|itinerary|michelin|recommendation|where to|how to)\b|\b\d+\s+(?:best|fresh|new|top|must)\b|\btop\s+\d+\b|\b\d+\s+[\w-]+\s+(?:spots|places|cafes|cafés|restaurants|stalls|eateries|bars|bakeries|hawkers?|joints)\b/i;

/**
 * Classify a title into a content type. Best run on the TITLE (not the body),
 * which is far less noisy. Deals win over everything (an opening WITH a deal is
 * still a deal); then events; then editorial/news. `editorialSource` biases
 * blog/review channels toward news. `aiHint` (the LLM's guess) is only trusted
 * for 'food_spot' — a genuine place recommendation — when no deal/news signal
 * is present, since regex alone can't recognise a recommendation.
 */
export function classifyContentType(
  title: string,
  editorialSource = false,
  aiHint?: ContentType,
): ContentType {
  if (DEAL_RE.test(title)) return "promotion";
  if (EVENT_RE.test(title)) return "event";
  if (NEWS_RE.test(title)) return "news";
  if (aiHint === "food_spot") return "food_spot";
  if (editorialSource) return "news";
  return aiHint && aiHint !== "promotion" ? aiHint : "promotion";
}

const FOOD_BRAND_RE =
  /(kfc|mcdonald'?s?|burger king|pizza hut|domino'?s|subway|popeyes|texas chicken|jollibee|starbucks|breadtalk|mister donut|krispy kreme|haidilao|sushi express|ya kun|toast box|old chang kee|mr bean|gong cha|liho|koi|playmade|yole|four ?fingers|swensen'?s|ikea .*buffet)/i;

/** Brand-name guardrail: food chains must be food_beverage whatever the model/regex guessed. */
export function brandCategory(title: string, current: PromoCategory): PromoCategory {
  return FOOD_BRAND_RE.test(title) ? "food_beverage" : current;
}

/** Strip URLs and tidy whitespace/markdown/trailing punctuation from a title. */
export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s|·–-]+$/, "")
    .trim();
}

/**
 * Deterministic, dependency-free extractor. Good enough to bootstrap and to
 * unit-test the pipeline; replace/augment with an LLM extractor later.
 */
export class RegexExtractor implements PromotionExtractor {
  readonly name = "regex";

  async extract(item: RawItem): Promise<ExtractedPromotion | null> {
    const text = item.text.trim();
    if (text.length < 10) return null;
    // Telegram service messages / channel housekeeping — not promotions.
    if (/^channel (created|photo|name|pinned)/i.test(text)) return null;

    // Drop posts whose validity is already past (e.g. "Till 30 April 2024").
    const today = new Date().toISOString().slice(0, 10);
    if (isExpiredByText(text, today)) return null;

    const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? text;
    const category = guessCategory(text);
    // Parse real validity dates from the natural-language text. The cue-anchored
    // deadline ("till/until/by <date>") is the binding end date when present;
    // otherwise use the furthest date found. Undated posts leave these null so
    // upsert applies its default window.
    const { start, end, cueEnd } = parseValidity(text, new Date().getFullYear());
    const effectiveEnd = cueEnd ?? end;

    const title = sanitizeTitle(firstLine).slice(0, 140);
    if (title.length < 8) return null;

    return {
      title,
      description: text.slice(0, 1000),
      category,
      contentType: classifyContentType(title),
      // "till 31 Dec" has no start of its own — leave it null so upsert uses the
      // publish date, instead of collapsing the whole window onto the end date.
      startDate: cueEnd && start === cueEnd && end === start ? null : start,
      endDate: effectiveEnd ?? start,
      location: null,
      tags: extractTags(text),
    };
  }
}

export function isKnownCategory(value: string): value is PromoCategory {
  return value in CATEGORY_META;
}

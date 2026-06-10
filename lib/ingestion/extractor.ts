import type {
  ContentType,
  ExtractedPromotion,
  PromotionExtractor,
  RawItem,
} from "@/lib/ingestion/types";
import type { PromoCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/constants";

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

/** Naive ISO date finder (YYYY-MM-DD or DD/MM/YYYY). */
function findDates(text: string): string[] {
  const iso = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  const dmy = (text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g) ?? []).map(
    (d) => {
      const [day, month, year] = d.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    },
  );
  return [...iso, ...dmy];
}

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
  /\b(opens?|opening|now open|reopens?|launch(?:es|ed|ing)?|unveil(?:s|ed)?|introduc(?:e|es|ed|ing)|debuts?|closing|closes?|shuts? down|review|guide|directory|itinerary|michelin|recommendation|where to|how to)\b|\b\d+\s+(?:best|fresh|new|top|must)\b|\btop\s+\d+\b/i;

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

    const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? text;
    const dates = findDates(text);
    const category = guessCategory(text);

    const title = sanitizeTitle(firstLine).slice(0, 140);
    if (title.length < 8) return null;

    return {
      title,
      description: text.slice(0, 1000),
      category,
      contentType: classifyContentType(title),
      startDate: dates[0] ?? null,
      endDate: dates[1] ?? dates[0] ?? null,
      location: null,
      tags: extractTags(text),
    };
  }
}

export function isKnownCategory(value: string): value is PromoCategory {
  return value in CATEGORY_META;
}

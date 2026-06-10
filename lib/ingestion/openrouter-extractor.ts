import type {
  ExtractedPromotion,
  PromotionExtractor,
  RawItem,
} from "@/lib/ingestion/types";
import type { PromoCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/constants";
import { RegexExtractor, sanitizeTitle, classifyContentType } from "@/lib/ingestion/extractor";
import type { ContentType } from "@/lib/ingestion/types";

const CATEGORIES = Object.keys(CATEGORY_META) as PromoCategory[];
const CONTENT_TYPES: ContentType[] = ["promotion", "food_spot", "event", "news"];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function isContentType(v: unknown): v is ContentType {
  return typeof v === "string" && (CONTENT_TYPES as string[]).includes(v);
}

function isCategory(v: unknown): v is PromoCategory {
  return typeof v === "string" && (CATEGORIES as string[]).includes(v);
}

function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

interface LlmResult {
  isPromotion?: boolean;
  contentType?: string;
  title?: string;
  description?: string;
  category?: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  tags?: string[];
}

/**
 * LLM-backed extractor using OpenRouter (free models). Turns messy
 * Telegram/web promo text into clean structured data. Falls back to the
 * deterministic {@link RegexExtractor} when the API key is missing or a call
 * fails, so ingestion always produces output.
 */
export class OpenRouterExtractor implements PromotionExtractor {
  readonly name = "openrouter";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxAttempts: number;
  private readonly fallback = new RegexExtractor();

  constructor(opts: { apiKey?: string; model?: string; maxAttempts?: number } = {}) {
    this.apiKey =
      opts.apiKey ??
      process.env.OPENROUTER_API_KEY ??
      process.env.API_KEY_OPENROUTER ??
      "";
    this.model =
      opts.model ??
      process.env.OPENROUTER_MODEL ??
      "meta-llama/llama-3.3-70b-instruct:free";
    // 1 attempt = no retry (cheapest on subrequest-limited runtimes).
    this.maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async extract(item: RawItem): Promise<ExtractedPromotion | null> {
    const text = item.text.trim();
    if (text.length < 10) return null;
    if (!this.isConfigured) return this.fallback.extract(item);

    try {
      const result = await this.callModel(text);
      if (!result) return this.fallback.extract(item);
      if (result.isPromotion === false) return null;
      if (!result.title) return this.fallback.extract(item);

      const title = sanitizeTitle(result.title);
      // Skip junk where the "title" is really just a link / too short to be useful.
      if (title.length < 8) return null;

      return {
        title: title.slice(0, 140),
        description: (result.description ?? text).slice(0, 1000).trim(),
        category: isCategory(result.category) ? result.category : "lifestyle",
        contentType: isContentType(result.contentType)
          ? result.contentType
          : classifyContentType(title),
        startDate: isoOrNull(result.startDate),
        endDate: isoOrNull(result.endDate),
        location: result.location?.trim() || null,
        tags: Array.isArray(result.tags)
          ? result.tags
              .filter((t): t is string => typeof t === "string")
              .map((t) => t.toLowerCase().trim())
              .slice(0, 8)
          : [],
      };
    } catch (err) {
      console.error(`[openrouter] extract failed, using regex:`, err);
      return this.fallback.extract(item);
    }
  }

  private async callModel(text: string): Promise<LlmResult | null> {
    const today = new Date().toISOString().slice(0, 10);
    const system =
      "You extract structured Singapore listings from raw social/blog posts. " +
      "Return ONLY a JSON object, no prose. " +
      `Today is ${today}. Resolve relative dates against it; assume the current ` +
      "year if a year is omitted. Dates must be YYYY-MM-DD or null. " +
      `category must be one of: ${CATEGORIES.join(", ")}. ` +
      "Classify contentType as exactly one of:\n" +
      "- 'promotion': a real consumer deal/offer with savings (1-for-1, % off, free gift, sale, cashback, voucher, special price).\n" +
      "- 'food_spot': a recommendation of a specific place to eat (a restaurant/hawker/café feature) with NO specific deal.\n" +
      "- 'event': a festival, market, pop-up, fair, expo or concert happening on given dates.\n" +
      "- 'news': editorial — a shop/restaurant OPENING or LAUNCH announcement, a review, a guide, a roundup ('10 best…'), or a closure, with NO deal.\n" +
      "A new-shop opening is 'news', NOT a promotion. A place recommendation without a discount is 'food_spot', NOT a promotion. " +
      "If the post is a job ad, channel advertisement or spam, set isPromotion to false.";

    const schema =
      '{"isPromotion": boolean, "contentType": "promotion"|"food_spot"|"event"|"news", ' +
      '"title": string (concise, <=140 chars), ' +
      '"description": string, "category": string, "startDate": string|null, ' +
      '"endDate": string|null, "location": string|null, "tags": string[] }';

    const payload = JSON.stringify({
      model: this.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\nJSON shape: ${schema}` },
        { role: "user", content: text.slice(0, 4000) },
      ],
    });

    // Free models are heavily shared and often return 429; retry with backoff
    // before giving up (the caller then falls back to regex).
    const maxAttempts = this.maxAttempts;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "PromoSG Ingestion",
        },
        body: payload,
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxAttempts) {
          await sleep(1500 * attempt);
          continue;
        }
        throw new Error(`OpenRouter ${res.status} after ${maxAttempts} tries`);
      }
      if (!res.ok) {
        throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      return parseJsonLoose(content);
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Models sometimes wrap JSON in prose or ```json fences — recover it. */
function parseJsonLoose(raw: string): LlmResult | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as LlmResult;
  } catch {
    return null;
  }
}

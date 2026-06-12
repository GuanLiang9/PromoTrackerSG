import { RssAdapter, TelegramAdapter } from "@/lib/ingestion/adapters";
import type { SourceAdapter } from "@/lib/ingestion/types";

/**
 * Live sources PromoSG ingests from. Public Telegram channels are read via
 * their web preview (no auth). RSS feeds are public food/lifestyle blogs.
 * Each source tolerates failure — a broken source never aborts the whole run.
 *
 * @param limit max messages/items per source (default 8).
 */
export function buildAdapters(limit = 8): SourceAdapter[] {
  return [
    // ── Deal-focused Telegram channels ──────────────────────────────────
    new TelegramAdapter("SG Deals", "SGDeals", limit),
    new TelegramAdapter("Great Deals SG", "GreatDealsSG", limit),
    new TelegramAdapter("SG Deal", "sgdeal", limit),
    new TelegramAdapter("Sing Promos", "SingPromos", limit),
    new TelegramAdapter("Burpple Beyond", "burpplebeyond", limit),
    new TelegramAdapter("GoodLobang", "goodlobang", limit),

    // ── Food-focused Telegram channels ───────────────────────────────────
    new TelegramAdapter("SG Foodie Deals", "SgFoodieDeals", limit),
    new TelegramAdapter("SG Food Deals", "sgfooddeals", limit),
    new TelegramAdapter("Eatbook SG", "eatbooksg", limit),
    new TelegramAdapter("Daniel Food Diary", "danielfooddiary", limit),
    new TelegramAdapter("SG Foodies", "sgfoodies", limit),
    new TelegramAdapter("Miss Tam Chiak", "MissTamChiak", limit),
    new TelegramAdapter("Seth Lui", "sethlui", limit),
    new TelegramAdapter("SG Food Lover", "sgfoodlover", limit),
    new TelegramAdapter("Klook SG", "klooksg", limit),
    new TelegramAdapter("SG Kiasu", "sgkiasu", limit),

    // ── Food & lifestyle RSS feeds ────────────────────────────────────────
    new RssAdapter("Eatbook", "https://eatbook.sg/feed/", limit),
    new RssAdapter("The Honeycombers SG", "https://thehoneycombers.com/singapore/feed/", limit),
    new RssAdapter("MoneySmart", "https://blog.moneysmart.sg/feed/", limit),
  ];
}

import { RssAdapter, TelegramAdapter } from "@/lib/ingestion/adapters";
import type { SourceAdapter } from "@/lib/ingestion/types";

/**
 * The live sources PromoSG ingests from. Public Telegram channels are read via
 * their web preview (no auth); RSS feeds are public deal/lifestyle blogs.
 * Add or remove entries here — the pipeline tolerates an individual source
 * failing without aborting the whole run.
 *
 * @param limit max messages/items to pull per source (default 8).
 */
export function buildAdapters(limit = 8): SourceAdapter[] {
  return [
    // Deal-focused Telegram channels
    new TelegramAdapter("SG Deals", "SGDeals", limit),
    new TelegramAdapter("Great Deals SG", "GreatDealsSG", limit),
    new TelegramAdapter("SG Deal", "sgdeal", limit),
    new TelegramAdapter("Sing Promos", "SingPromos", limit),
    new TelegramAdapter("SG Foodie Deals", "SgFoodieDeals", limit),
    new TelegramAdapter("Klook SG", "klooksg", limit),
    new TelegramAdapter("SG Kiasu", "sgkiasu", limit),
    // Food / lifestyle (the AI extractor filters out non-promo articles)
    new TelegramAdapter("Miss Tam Chiak", "MissTamChiak", limit),
    new TelegramAdapter("Seth Lui", "sethlui", limit),
    // RSS
    new RssAdapter("MoneySmart", "https://blog.moneysmart.sg/feed/", limit),
    new RssAdapter("The Smart Local", "https://thesmartlocal.com/feed/", limit),
  ];
}

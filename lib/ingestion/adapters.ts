import type { RawItem, SourceAdapter } from "@/lib/ingestion/types";

/**
 * Source adapter stubs. Each defines the contract and a clearly-marked TODO for
 * live fetching. They return [] today so the pipeline can be wired and tested
 * end-to-end without external network/credentials.
 */

export class TelegramAdapter implements SourceAdapter {
  readonly kind = "telegram" as const;
  constructor(public readonly name: string, private readonly channel: string) {}

  async fetch(): Promise<RawItem[]> {
    // TODO: pull recent messages via Telegram Bot API / MTProto for `channel`.
    void this.channel;
    return [];
  }
}

export class RssAdapter implements SourceAdapter {
  readonly kind = "rss" as const;
  constructor(public readonly name: string, private readonly feedUrl: string) {}

  async fetch(): Promise<RawItem[]> {
    // TODO: fetch + parse the RSS/Atom feed at `feedUrl`.
    void this.feedUrl;
    return [];
  }
}

export class WebsiteAdapter implements SourceAdapter {
  readonly kind = "website" as const;
  constructor(public readonly name: string, private readonly pageUrl: string) {}

  async fetch(): Promise<RawItem[]> {
    // TODO: fetch + scrape promotion listings from `pageUrl`.
    void this.pageUrl;
    return [];
  }
}

export class EventSiteAdapter implements SourceAdapter {
  readonly kind = "event_site" as const;
  constructor(public readonly name: string, private readonly apiUrl: string) {}

  async fetch(): Promise<RawItem[]> {
    // TODO: query the events API at `apiUrl`.
    void this.apiUrl;
    return [];
  }
}

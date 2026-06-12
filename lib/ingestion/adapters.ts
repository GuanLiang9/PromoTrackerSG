import type { RawItem, SourceAdapter } from "@/lib/ingestion/types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Decode the handful of HTML entities Telegram/RSS emit. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** Strip tags, turn <br>/block ends into newlines, collapse whitespace. */
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Reads a public Telegram channel via its web preview (https://t.me/s/<channel>)
 * — no bot token or auth required. Parses the most recent message bubbles.
 */
export class TelegramAdapter implements SourceAdapter {
  readonly kind = "telegram" as const;
  constructor(
    public readonly name: string,
    private readonly channel: string,
    private readonly limit = 8,
  ) {}

  async fetch(): Promise<RawItem[]> {
    const url = `https://t.me/s/${this.channel}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`telegram ${this.channel}: HTTP ${res.status}`);
    const html = await res.text();

    const items: RawItem[] = [];
    // Slice the page into one chunk per message, anchored by the message's
    // data-post="<channel>/<id>" attribute (each message has exactly one).
    const anchors = [...html.matchAll(/data-post="([^"]+)"/g)];
    for (let i = 0; i < anchors.length; i++) {
      const externalId = anchors[i][1];
      const start = anchors[i].index ?? 0;
      const end = anchors[i + 1]?.index ?? html.length;
      const chunk = html.slice(start, end);

      const textMatch = chunk.match(
        /tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      );
      if (!textMatch) continue;
      const text = htmlToText(textMatch[1]);
      if (text.length < 15) continue;

      const time = chunk.match(/datetime="([^"]+)"/);

      const publishedAt = time ? time[1] : undefined;
      // Skip posts older than 14 days — Telegram previews include historical
      // messages and old posts create stale promos with fake future end_dates.
      if (publishedAt) {
        const ageMs = Date.now() - new Date(publishedAt).getTime();
        if (ageMs > 14 * 24 * 60 * 60 * 1000) continue;
      }

      // Note: we intentionally don't capture the Telegram preview photo —
      // its cdn (telesco.pe) URLs are short-lived tokens that 404 within hours.
      // The ingest route fills a stable stock photo via resolveImage instead.
      items.push({
        externalId: `telegram:${externalId}`,
        sourceName: this.name,
        sourceUrl: `https://t.me/${externalId}`,
        text,
        imageUrl: undefined,
        publishedAt,
      });
    }
    // Telegram preview is oldest→newest; keep the most recent messages.
    return items.slice(-this.limit);
  }
}

/** Fetches + parses an RSS/Atom feed into raw items. */
export class RssAdapter implements SourceAdapter {
  readonly kind = "rss" as const;
  constructor(
    public readonly name: string,
    private readonly feedUrl: string,
    private readonly limit = 8,
  ) {}

  async fetch(): Promise<RawItem[]> {
    const res = await fetch(this.feedUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`rss ${this.name}: HTTP ${res.status}`);
    const xml = await res.text();

    const items: RawItem[] = [];
    const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
    for (const entry of entries) {
      const title = pickTag(entry, "title");
      const link = pickLink(entry);
      const desc = pickTag(entry, "description") || pickTag(entry, "summary") ||
        pickTag(entry, "content:encoded");
      const date = pickTag(entry, "pubDate") || pickTag(entry, "updated") ||
        pickTag(entry, "published");
      const text = htmlToText(`${title}\n\n${desc}`);
      if (text.length < 15) continue;

      // Skip posts older than 30 days (RSS feeds may include months of archives).
      if (date) {
        const ageMs = Date.now() - new Date(date).getTime();
        if (ageMs > 30 * 24 * 60 * 60 * 1000) continue;
      }

      items.push({
        externalId: `rss:${link || title}`,
        sourceName: this.name,
        sourceUrl: link || undefined,
        text,
        imageUrl: pickImage(entry),
        publishedAt: date || undefined,
      });
      if (items.length >= this.limit) break;
    }
    return items;
  }
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function pickTag(entry: string, tag: string): string {
  const m = entry.match(
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return m ? stripCdata(m[1]).trim() : "";
}

function pickLink(entry: string): string {
  const rss = entry.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return stripCdata(rss[1]).trim();
  const atom = entry.match(/<link\b[^>]*href="([^"]+)"/i);
  return atom ? atom[1] : "";
}

function pickImage(entry: string): string | undefined {
  const media = entry.match(/<(?:media:content|enclosure)\b[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const img = entry.match(/<img[^>]*src="([^"]+)"/i);
  return img ? img[1] : undefined;
}

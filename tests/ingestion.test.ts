import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RegexExtractor } from "@/lib/ingestion/extractor";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import type { RawItem, SourceAdapter } from "@/lib/ingestion/types";

const extractor = new RegexExtractor();

// Fixtures use fixed June 2026 dates; pin the clock so they aren't treated as expired.
beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-01T00:00:00Z")); });
afterAll(() => { vi.useRealTimers(); });

function rawItem(partial: Partial<RawItem>): RawItem {
  return {
    externalId: "1",
    sourceName: "Test Channel",
    text: "Sample",
    ...partial,
  };
}

describe("RegexExtractor", () => {
  it("returns null for too-short text", async () => {
    expect(await extractor.extract(rawItem({ text: "hi" }))).toBeNull();
  });

  it("extracts a title, dates, category and hashtags", async () => {
    const result = await extractor.extract(
      rawItem({
        text:
          "1-for-1 Buffet Dinner!\nValid 2026-06-10 to 2026-06-20 at the restaurant. #dining #deal",
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.title).toContain("Buffet");
    expect(result!.category).toBe("food_beverage");
    expect(result!.startDate).toBe("2026-06-10");
    expect(result!.endDate).toBe("2026-06-20");
    expect(result!.tags).toEqual(expect.arrayContaining(["dining", "deal"]));
  });

  it("parses DD/MM/YYYY dates", async () => {
    const result = await extractor.extract(
      rawItem({ text: "Credit card cashback offer from 05/06/2026 onwards" }),
    );
    expect(result!.startDate).toBe("2026-06-05");
    expect(result!.category).toBe("credit_card");
  });
});

describe("IngestionPipeline", () => {
  function adapter(name: string, items: RawItem[]): SourceAdapter {
    return { name, kind: "telegram", fetch: async () => items };
  }

  it("normalizes and deduplicates by source + title", async () => {
    const items: RawItem[] = [
      rawItem({ externalId: "1", text: "Mega Sale 50% off everything!" }),
      rawItem({ externalId: "2", text: "Mega Sale 50% off everything!" }), // dup
      rawItem({ externalId: "3", text: "Hotel staycation deal this weekend" }),
    ];
    const pipeline = new IngestionPipeline([adapter("A", items)], extractor);
    const out = await pipeline.run();
    expect(out).toHaveLength(2);
    expect(new Set(out.map((o) => o.dedupeKey)).size).toBe(2);
  });

  it("continues when one adapter throws", async () => {
    const bad: SourceAdapter = {
      name: "bad",
      kind: "rss",
      fetch: async () => {
        throw new Error("network");
      },
    };
    const good = adapter("good", [rawItem({ text: "A great shopping discount" })]);
    const pipeline = new IngestionPipeline([bad, good], extractor);
    const out = await pipeline.run();
    expect(out).toHaveLength(1);
  });
});

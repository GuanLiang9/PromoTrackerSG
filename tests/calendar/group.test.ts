import { describe, expect, it } from "vitest";
import { countByDay, groupPromotionsByDay } from "@/lib/calendar/group";
import { getCalendarRange, toDateKey } from "@/lib/calendar/date";
import type { Promotion } from "@/lib/types";

function makePromo(id: string, start: string, end: string): Promotion {
  return {
    id,
    title: `Promo ${id}`,
    description: "",
    category: "shopping",
    startDate: start,
    endDate: end,
    location: null,
    latitude: null,
    longitude: null,
    imageUrl: null,
    sourceName: null,
    sourceUrl: null,
    tags: [],
    terms: null,
    status: "active",
    createdAt: "",
    updatedAt: "",
  };
}

describe("groupPromotionsByDay", () => {
  const days = getCalendarRange("week", new Date("2026-06-10"));

  it("places a single-day promo on exactly one day", () => {
    const buckets = groupPromotionsByDay(
      [makePromo("a", "2026-06-10", "2026-06-10")],
      days,
    );
    expect(buckets.get("2026-06-10")?.promotions).toHaveLength(1);
    expect(buckets.get("2026-06-11")?.promotions ?? []).toHaveLength(0);
  });

  it("spans a multi-day promo across every day in its interval", () => {
    const buckets = groupPromotionsByDay(
      [makePromo("b", "2026-06-09", "2026-06-12")],
      days,
    );
    for (const key of ["2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]) {
      expect(buckets.get(key)?.promotions).toHaveLength(1);
    }
  });

  it("creates a bucket for every day in the range", () => {
    const buckets = groupPromotionsByDay([], days);
    expect(buckets.size).toBe(days.length);
    for (const d of days) expect(buckets.has(toDateKey(d))).toBe(true);
  });
});

describe("countByDay", () => {
  it("counts overlapping promotions per day", () => {
    const days = getCalendarRange("week", new Date("2026-06-10"));
    const counts = countByDay(
      [
        makePromo("a", "2026-06-10", "2026-06-11"),
        makePromo("b", "2026-06-11", "2026-06-11"),
      ],
      days,
    );
    expect(counts.get("2026-06-10")).toBe(1);
    expect(counts.get("2026-06-11")).toBe(2);
  });
});

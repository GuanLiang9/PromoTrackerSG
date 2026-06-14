import { describe, it, expect } from "vitest";
import { computeStats, type CheckInStatRow } from "@/lib/rewards/compute";
import { sgToday, addDays } from "@/lib/rewards/sg-date";

/** Build a row whose SG day is `dayKey`, at noon SGT (04:00 UTC) to avoid edges. */
function row(dayKey: string, over: Partial<CheckInStatRow> = {}): CheckInStatRow {
  return {
    created_at: `${dayKey}T04:00:00.000Z`,
    venue_name: over.venue_name ?? "Toast Box",
    area: over.area ?? "Tampines",
    cuisine: over.cuisine ?? "hawker",
    rating: over.rating ?? null,
  };
}

describe("computeStats", () => {
  it("returns zeroed stats for no rows", () => {
    const s = computeStats([]);
    expect(s.checkIns).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(0);
    expect(s.points).toBe(0);
    expect(s.level.name).toBe("Newbie");
  });

  it("counts a live streak ending today", () => {
    const t = sgToday();
    const s = computeStats([row(addDays(t, -2)), row(addDays(t, -1)), row(t)]);
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
    expect(s.checkedInToday).toBe(true);
  });

  it("keeps the streak alive when the last check-in was yesterday", () => {
    const t = sgToday();
    const s = computeStats([row(addDays(t, -2)), row(addDays(t, -1))]);
    expect(s.currentStreak).toBe(2);
    expect(s.checkedInToday).toBe(false);
  });

  it("resets the current streak after a 2-day gap but keeps the longest", () => {
    const t = sgToday();
    const s = computeStats([row(addDays(t, -10)), row(addDays(t, -9)), row(addDays(t, -8))]);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(3);
  });

  it("matches the leaderboard points formula (checkIns*10 + venues*15 + days*5)", () => {
    const t = sgToday();
    // 3 check-ins across 3 days at 2 distinct venues → 3*10 + 2*15 + 3*5 = 75.
    const s = computeStats([
      row(addDays(t, -2), { venue_name: "A" }),
      row(addDays(t, -1), { venue_name: "B" }),
      row(t, { venue_name: "A" }),
    ]);
    expect(s.checkIns).toBe(3);
    expect(s.venues).toBe(2);
    expect(s.days).toBe(3);
    expect(s.points).toBe(75);
  });

  it("tracks distinct areas, cuisines, ratings and max-at-one-venue", () => {
    const t = sgToday();
    const s = computeStats([
      row(t, { venue_name: "X", area: "Bedok", cuisine: "korean", rating: 5 }),
      row(addDays(t, -1), { venue_name: "X", area: "Bedok", cuisine: "japanese", rating: 4 }),
      row(addDays(t, -2), { venue_name: "Y", area: "Orchard", cuisine: "korean", rating: null }),
    ]);
    expect(s.areas).toBe(2);
    expect(s.cuisines).toBe(2);
    expect(s.ratings).toBe(2);
    expect(s.maxAtOneVenue).toBe(2);
  });
});

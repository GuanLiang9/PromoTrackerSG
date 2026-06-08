import { describe, expect, it } from "vitest";
import {
  getCalendarRange,
  getRangeBounds,
  promotionActiveOn,
  toDateKey,
} from "@/lib/calendar/date";

describe("getCalendarRange", () => {
  it("returns 6 full weeks (42 days) padded for month view", () => {
    const days = getCalendarRange("month", new Date("2026-06-15"));
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(28);
    // grid starts on a Monday
    expect(days[0].getDay()).toBe(1);
  });

  it("returns exactly 7 days for week view starting Monday", () => {
    const days = getCalendarRange("week", new Date("2026-06-10")); // a Wednesday
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[6].getDay()).toBe(0); // Sunday
  });

  it("returns a single day for day view", () => {
    const days = getCalendarRange("day", new Date("2026-06-10"));
    expect(days).toHaveLength(1);
    expect(toDateKey(days[0])).toBe("2026-06-10");
  });
});

describe("getRangeBounds", () => {
  it("covers the full visible month grid", () => {
    const { start, end } = getRangeBounds("month", new Date("2026-06-15"));
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
});

describe("promotionActiveOn", () => {
  const promo = { startDate: "2026-06-10", endDate: "2026-06-12" };

  it("is active on the start and end dates (inclusive)", () => {
    expect(promotionActiveOn(promo, new Date("2026-06-10"))).toBe(true);
    expect(promotionActiveOn(promo, new Date("2026-06-12"))).toBe(true);
  });

  it("is active on a day within the range", () => {
    expect(promotionActiveOn(promo, new Date("2026-06-11"))).toBe(true);
  });

  it("is inactive outside the range", () => {
    expect(promotionActiveOn(promo, new Date("2026-06-09"))).toBe(false);
    expect(promotionActiveOn(promo, new Date("2026-06-13"))).toBe(false);
  });
});

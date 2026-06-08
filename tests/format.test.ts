import { describe, expect, it } from "vitest";
import { endingInLabel, formatDateRange } from "@/lib/format";

describe("formatDateRange", () => {
  it("shows a single date when start === end", () => {
    expect(formatDateRange("2026-06-12", "2026-06-12")).toBe("12 Jun 2026");
  });

  it("shows a range within the same year", () => {
    expect(formatDateRange("2026-06-12", "2026-06-30")).toBe(
      "12 Jun – 30 Jun 2026",
    );
  });

  it("includes both years when they differ", () => {
    expect(formatDateRange("2026-12-30", "2027-01-05")).toBe(
      "30 Dec 2026 – 5 Jan 2027",
    );
  });
});

describe("endingInLabel", () => {
  const now = new Date("2026-06-10T08:00:00");

  it("returns 'Ends today' for same-day end", () => {
    expect(endingInLabel("2026-06-10", now)).toBe("Ends today");
  });

  it("returns 'Ends tomorrow'", () => {
    expect(endingInLabel("2026-06-11", now)).toBe("Ends tomorrow");
  });

  it("returns a day count within a week", () => {
    expect(endingInLabel("2026-06-15", now)).toBe("Ends in 5 days");
  });

  it("returns null when more than a week away or already ended", () => {
    expect(endingInLabel("2026-06-30", now)).toBeNull();
    expect(endingInLabel("2026-06-01", now)).toBeNull();
  });
});

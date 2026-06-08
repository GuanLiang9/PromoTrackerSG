import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_META, getCategoryMeta } from "@/lib/constants";

const EXPECTED: Array<keyof typeof CATEGORY_META> = [
  "food_beverage",
  "shopping",
  "attractions",
  "events",
  "travel",
  "credit_card",
  "entertainment",
  "lifestyle",
];

describe("category metadata", () => {
  it("defines all eight categories", () => {
    expect(CATEGORIES).toHaveLength(8);
    for (const key of EXPECTED) expect(CATEGORY_META[key]).toBeDefined();
  });

  it("each category has color + label fields populated", () => {
    for (const meta of CATEGORIES) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.chipClass.length).toBeGreaterThan(0);
      expect(meta.dotClass.length).toBeGreaterThan(0);
      expect(meta.badgeClass.length).toBeGreaterThan(0);
    }
  });

  it("getCategoryMeta returns the matching entry", () => {
    expect(getCategoryMeta("travel").label).toBe("Travel");
  });
});

import { describe, expect, it } from "vitest";
import {
  parsePromotionFilters,
  serializeFilters,
} from "@/lib/promotions/search-params";

describe("parsePromotionFilters", () => {
  it("parses query from q or query keys", () => {
    expect(parsePromotionFilters({ q: "buffet" }).query).toBe("buffet");
    expect(parsePromotionFilters({ query: "sale" }).query).toBe("sale");
  });

  it("parses and validates comma-separated categories", () => {
    const f = parsePromotionFilters({ category: "food_beverage,shopping,bogus" });
    expect(f.categories).toEqual(["food_beverage", "shopping"]);
  });

  it("drops empty / whitespace-only values", () => {
    const f = parsePromotionFilters({ q: "   ", location: "" });
    expect(f.query).toBeUndefined();
    expect(f.location).toBeUndefined();
  });

  it("returns undefined categories when none are valid", () => {
    expect(parsePromotionFilters({ category: "nope" }).categories).toBeUndefined();
  });

  it("round-trips through serialize → parse", () => {
    const filters = {
      query: "coffee",
      categories: ["food_beverage" as const],
      from: "2026-06-01",
      to: "2026-06-30",
      location: "Orchard",
    };
    const qs = serializeFilters(filters);
    const parsed = parsePromotionFilters(
      Object.fromEntries(new URLSearchParams(qs)),
    );
    expect(parsed).toEqual(filters);
  });
});

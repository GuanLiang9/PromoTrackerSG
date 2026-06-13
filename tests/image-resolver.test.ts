import { describe, it, expect } from "vitest";
import { resolveImage } from "@/lib/ingestion/image-resolver";

describe("resolveImage priority", () => {
  it("falls back to the category default when nothing matches", () => {
    const r = resolveImage("Mystery offer", "no clues here", "lifestyle");
    expect(r.source).toBe("category");
    expect(r.url).toContain("images.unsplash.com");
  });

  it("matches a keyword in the title/description", () => {
    const r = resolveImage("1-for-1 Ramen", "tonkotsu special", "food_beverage");
    expect(r.source).toBe("keyword");
  });

  it("prefers the LLM image subject over a misleading title keyword", () => {
    // Title mentions "coffee" but the LLM says the photo subject is sushi.
    const r = resolveImage("Coffee club member treat", "members only", "food_beverage", {
      subject: "salmon sushi platter",
    });
    expect(r.source).toBe("subject");
  });

  it("lets a learned override win over everything", () => {
    const overrides = new Map([["mcdonald", "https://example.com/correct-mcd.jpg"]]);
    const r = resolveImage("McDonald's McSpicy is back", "limited time", "food_beverage", {
      subject: "fried chicken burger",
      overrides,
    });
    expect(r.source).toBe("override");
    expect(r.url).toBe("https://example.com/correct-mcd.jpg");
  });

  it("matches the longest override keyword first", () => {
    const overrides = new Map([
      ["tea", "https://example.com/tea.jpg"],
      ["bubble tea", "https://example.com/bubbletea.jpg"],
    ]);
    const r = resolveImage("New bubble tea flavour", "", "food_beverage", { overrides });
    expect(r.url).toBe("https://example.com/bubbletea.jpg");
  });
});

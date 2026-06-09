import type { PromotionFilters } from "@/lib/types";

export interface LandingConfig {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  filters: PromotionFilters;
}

/** SEO landing pages. Each renders a server-side filtered promotion list. */
export const LANDING_PAGES: LandingConfig[] = [
  {
    slug: "today-promotions-singapore",
    h1: "Today's Promotions in Singapore",
    title: "Today's Promotions in Singapore — Deals On Now",
    description:
      "Live list of promotions, deals and discounts running in Singapore today. Updated daily across food, shopping, attractions and more.",
    intro: "Every deal running right now across Singapore, ranked by our Worth-Going Score.",
    filters: { sort: "today" },
  },
  {
    slug: "weekend-deals-singapore",
    h1: "Weekend Deals in Singapore",
    title: "Weekend Deals in Singapore — This Week's Best Offers",
    description:
      "The best promotions and deals to enjoy this weekend in Singapore — dining, attractions, shopping and family activities.",
    intro: "Plan your weekend with the top Singapore deals on now and coming up.",
    filters: { sort: "trending" },
  },
  {
    slug: "food-promotions-singapore",
    h1: "Food & Dining Promotions in Singapore",
    title: "Food Promotions Singapore — 1-for-1, Buffets & Dining Deals",
    description:
      "Find the latest food and dining promotions in Singapore: 1-for-1 deals, buffet discounts, cafe offers and restaurant vouchers.",
    intro: "1-for-1, buffets, cafes and restaurant deals across Singapore.",
    filters: { categories: ["food_beverage"], sort: "trending" },
  },
  {
    slug: "family-activities-singapore",
    h1: "Family Activities & Attraction Deals in Singapore",
    title: "Family Activities Singapore — Attraction & Event Deals",
    description:
      "Discounts on Singapore attractions, events and family-friendly activities. Great days out for less.",
    intro: "Attractions, events and things to do with the family — for less.",
    filters: { categories: ["attractions", "events", "lifestyle"], sort: "trending" },
  },
  {
    slug: "shopping-deals-singapore",
    h1: "Shopping Deals in Singapore",
    title: "Shopping Deals Singapore — Sales, Vouchers & Discounts",
    description:
      "Latest shopping promotions in Singapore: mall sales, online vouchers, electronics deals and retail discounts.",
    intro: "Sales, vouchers and retail discounts from across Singapore.",
    filters: { categories: ["shopping"], sort: "trending" },
  },
];

export function getLanding(slug: string): LandingConfig | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}

import type { Metadata } from "next";
import { EatClient } from "@/components/food/eat-client";
import { getFoodSpots } from "@/lib/promotions/queries";
import type { CuisineType, PriceRange } from "@/lib/food/spots";

export const metadata: Metadata = {
  title: "Where to Eat in Singapore",
  description: "Curated food recommendations — hawker gems, hidden eats and must-try spots across Singapore.",
};
export const dynamic = "force-dynamic";

export default async function EatPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; price?: string }>;
}) {
  const { cuisine, price } = await searchParams;
  // Food recommendations only (content_type='food_spot') — never deals/news.
  const foodDeals = await getFoodSpots();
  return (
    <EatClient
      foodDeals={foodDeals}
      initialCuisine={(cuisine as CuisineType) ?? null}
      initialPrice={(price as PriceRange) ?? null}
    />
  );
}

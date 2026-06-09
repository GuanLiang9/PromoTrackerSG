import type { Metadata } from "next";
import { EatClient } from "@/components/food/eat-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { mapRowToPromotion } from "@/lib/promotions/mappers";
import type { PromotionRow } from "@/lib/types";
import type { CuisineType, PriceRange } from "@/lib/food/spots";

export const metadata: Metadata = {
  title: "Where to Eat in Singapore",
  description: "Discover the best food spots, hawker centres, restaurants and live food deals across Singapore.",
};
export const dynamic = "force-dynamic";

async function getFoodDeals() {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const savedIds = new Set<string>();
  if (user) {
    const { data } = await supabase
      .from("saved_promotions")
      .select("promotion_id")
      .eq("user_id", user.id);
    (data ?? []).forEach((r) => savedIds.add(r.promotion_id as string));
  }

  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("status", "active")
    .eq("category", "food_beverage")
    .order("base_score", { ascending: false, nullsFirst: false })
    .limit(20);

  return (data as PromotionRow[] ?? []).map((r) => mapRowToPromotion(r, savedIds));
}

export default async function EatPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; price?: string }>;
}) {
  const { cuisine, price } = await searchParams;
  const foodDeals = await getFoodDeals();
  return (
    <EatClient
      foodDeals={foodDeals}
      initialCuisine={(cuisine as CuisineType) ?? null}
      initialPrice={(price as PriceRange) ?? null}
    />
  );
}

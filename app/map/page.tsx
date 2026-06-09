import type { Metadata } from "next";
import { MapRoot } from "@/components/map/map-root";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getPromotionsWithCoords } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { FOOD_SPOTS } from "@/lib/food/spots";
import { HIDDEN_GEMS } from "@/lib/gems/gems";
import { foodSpotToPin, gemToPin } from "@/lib/map/static-pins";

export const metadata: Metadata = { title: "Map" };
export const dynamic = "force-dynamic";

const foodPins = FOOD_SPOTS.map(foodSpotToPin).filter(Boolean) as NonNullable<ReturnType<typeof foodSpotToPin>>[];
const gemPins = HIDDEN_GEMS.map(gemToPin);

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const promotions = await getPromotionsWithCoords();

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <MapRoot
      promotions={promotions}
      foodPins={foodPins}
      gemPins={gemPins}
      focusId={id ?? null}
    />
  );
}

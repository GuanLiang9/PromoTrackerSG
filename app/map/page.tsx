import type { Metadata } from "next";
import { MapRoot } from "@/components/map/map-root";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getPromotionsWithCoords } from "@/lib/promotions/queries";
import { getCheckInsWithCoords } from "@/lib/checkins/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { FOOD_SPOTS } from "@/lib/food/spots";
import { HIDDEN_GEMS } from "@/lib/gems/gems";
import { foodSpotToPin, gemToPin, checkInToPin } from "@/lib/map/static-pins";

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

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const [promotions, checkIns] = await Promise.all([
    getPromotionsWithCoords(),
    getCheckInsWithCoords(),
  ]);
  const spotPins = checkIns.map(checkInToPin);

  return (
    <MapRoot
      promotions={promotions}
      foodPins={foodPins}
      gemPins={gemPins}
      spotPins={spotPins}
      focusId={id ?? null}
    />
  );
}

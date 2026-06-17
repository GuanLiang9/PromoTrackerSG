import type { Metadata } from "next";
import { MapRoot } from "@/components/map/map-root";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getPromotionsWithCoords } from "@/lib/promotions/queries";
import { getCheckInsWithCoords, getCurrentUserId } from "@/lib/checkins/queries";
import { getAcceptedFriendIds } from "@/lib/friends/queries";
import { getAuthorsFor } from "@/lib/profiles/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { FOOD_SPOTS } from "@/lib/food/spots";
import { JB_FOOD_SPOTS } from "@/lib/food/jb-spots";
import { HIDDEN_GEMS } from "@/lib/gems/gems";
import { foodSpotToPin, gemToPin, checkInToPin } from "@/lib/map/static-pins";

export const metadata: Metadata = { title: "Map" };
export const dynamic = "force-dynamic";

const foodPins = [...FOOD_SPOTS, ...JB_FOOD_SPOTS]
  .map(foodSpotToPin)
  .filter(Boolean) as NonNullable<ReturnType<typeof foodSpotToPin>>[];
const gemPins = HIDDEN_GEMS.map(gemToPin);

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; spot?: string }>;
}) {
  const { id, spot } = await searchParams;

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const [promotions, checkIns, currentUserId] = await Promise.all([
    getPromotionsWithCoords(),
    getCheckInsWithCoords(),
    getCurrentUserId(),
  ]);
  const [friendIds, authors] = await Promise.all([
    currentUserId ? getAcceptedFriendIds(currentUserId) : Promise.resolve([]),
    getAuthorsFor(checkIns),
  ]);
  const spotPins = checkIns.map((c) => checkInToPin(c, authors[c.userId]));

  return (
    <MapRoot
      promotions={promotions}
      foodPins={foodPins}
      gemPins={gemPins}
      spotPins={spotPins}
      currentUserId={currentUserId}
      friendIds={friendIds}
      focusId={id ?? null}
      focusSpotId={spot ?? null}
    />
  );
}

import type { Metadata } from "next";
import { MapRoot } from "@/components/map/map-root";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getPromotionsWithCoords } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Map" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const promotions = await getPromotionsWithCoords();

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return <MapRoot promotions={promotions} />;
}

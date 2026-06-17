import type { Metadata } from "next";
import { SpotsClient } from "@/components/checkins/spots-client";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getRecentCheckIns, getCurrentUserId } from "@/lib/checkins/queries";
import { getAcceptedFriendIds } from "@/lib/friends/queries";
import { getAuthorsFor } from "@/lib/profiles/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Community Spots",
  description: "Restaurants and cafés checked in by the community across Singapore.",
};
export const dynamic = "force-dynamic";

export default async function SpotsPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const [checkIns, currentUserId] = await Promise.all([
    getRecentCheckIns(),
    getCurrentUserId(),
  ]);
  const [friendIds, authors] = await Promise.all([
    currentUserId ? getAcceptedFriendIds(currentUserId) : Promise.resolve([]),
    getAuthorsFor(checkIns),
  ]);

  return (
    <SpotsClient
      checkIns={checkIns}
      currentUserId={currentUserId}
      friendIds={friendIds}
      authors={authors}
    />
  );
}

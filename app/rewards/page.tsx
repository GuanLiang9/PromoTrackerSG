import type { Metadata } from "next";
import { RewardsClient } from "@/components/rewards/rewards-client";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUserId } from "@/lib/checkins/queries";
import { computeStats } from "@/lib/rewards/compute";
import { getUserCheckInRows, getLeaderboard, getUserRank } from "@/lib/rewards/queries";

export const metadata: Metadata = {
  title: "Rewards",
  description: "Build a check-in streak, earn points, unlock badges and climb the leaderboard.",
};
export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const userId = await getCurrentUserId();

  const [leaderboard, rows] = await Promise.all([
    getLeaderboard(50),
    userId ? getUserCheckInRows(userId) : Promise.resolve([]),
  ]);

  const personal = userId ? computeStats(rows) : null;
  const rank = personal ? await getUserRank(personal.points) : null;

  return (
    <RewardsClient
      personal={personal}
      rank={rank}
      leaderboard={leaderboard}
      currentUserId={userId}
    />
  );
}

import type { Metadata } from "next";
import { RewardsClient } from "@/components/rewards/rewards-client";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUserId } from "@/lib/checkins/queries";
import { computeStats } from "@/lib/rewards/compute";
import { computeWeeklyQuests } from "@/lib/rewards/quests";
import {
  getUserCheckInRows,
  getLeaderboard,
  getFriendsLeaderboard,
  getUserRank,
} from "@/lib/rewards/queries";

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

  const [leaderboard, friendsLeaderboard, rows] = await Promise.all([
    getLeaderboard(50),
    userId ? getFriendsLeaderboard(userId) : Promise.resolve([]),
    userId ? getUserCheckInRows(userId) : Promise.resolve([]),
  ]);

  const personal = userId ? computeStats(rows) : null;
  const quests = userId ? computeWeeklyQuests(rows) : [];
  const rank = personal ? await getUserRank(personal.points) : null;

  return (
    <RewardsClient
      personal={personal}
      rank={rank}
      leaderboard={leaderboard}
      friendsLeaderboard={friendsLeaderboard}
      quests={quests}
      currentUserId={userId}
    />
  );
}

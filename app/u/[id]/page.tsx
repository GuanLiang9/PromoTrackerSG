import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SetupNotice } from "@/components/layout/setup-notice";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { FriendButton } from "@/components/friends/friend-button";
import { CheckInTimeline } from "@/components/timeline/checkin-timeline";
import { BadgesGrid } from "@/components/rewards/badges-grid";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUserId, getUserCheckIns } from "@/lib/checkins/queries";
import { getProfile } from "@/lib/profiles/queries";
import { displayNameOf } from "@/lib/profiles/types";
import { computeStats } from "@/lib/rewards/compute";
import { getUserCheckInRows, getUserRank } from "@/lib/rewards/queries";
import { getFriendshipWith } from "@/lib/friends/queries";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { id } = await params;
  const me = await getCurrentUserId();
  if (me && me === id) redirect("/profile");

  const profile = await getProfile(id);
  if (!profile) notFound();

  const [rows, timeline] = await Promise.all([
    getUserCheckInRows(id),
    getUserCheckIns(id),
  ]);
  const stats = computeStats(rows);
  const rank = await getUserRank(stats.points);

  const friendship = me ? await getFriendshipWith(me, id) : null;

  return (
    <div className="space-y-6 pb-4">
      <ProfileHeader
        profile={profile}
        stats={stats}
        rank={rank}
        action={
          friendship ? (
            <FriendButton
              targetUserId={id}
              initialStatus={friendship.status}
              edgeId={friendship.edgeId}
            />
          ) : undefined
        }
      />

      <ProfileTabs
        timeline={
          <CheckInTimeline
            checkIns={timeline}
            emptyLabel={`${displayNameOf(profile)} hasn't checked in anywhere yet.`}
          />
        }
        badges={<BadgesGrid stats={stats} />}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/layout/setup-notice";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { EditProfileButton, EditableAvatar } from "@/components/profile/edit-profile-sheet";
import { CheckInTimeline } from "@/components/timeline/checkin-timeline";
import { BadgesGrid } from "@/components/rewards/badges-grid";
import { FriendsTab } from "@/components/friends/friends-tab";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUserId, getUserCheckIns } from "@/lib/checkins/queries";
import { getProfile } from "@/lib/profiles/queries";
import { displayNameOf, type PublicProfile } from "@/lib/profiles/types";
import { computeStats } from "@/lib/rewards/compute";
import { getUserCheckInRows, getUserRank } from "@/lib/rewards/queries";
import { getFriends, getPendingRequests } from "@/lib/friends/queries";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/login?next=/profile");

  const [profileRaw, rows, timeline, friends, pending] = await Promise.all([
    getProfile(userId),
    getUserCheckInRows(userId),
    getUserCheckIns(userId),
    getFriends(userId),
    getPendingRequests(userId),
  ]);

  const profile: PublicProfile = profileRaw ?? {
    id: userId,
    displayName: "Foodie",
    avatarUrl: null,
    bio: null,
    username: null,
    isPublic: false,
  };
  const stats = computeStats(rows);
  const rank = await getUserRank(stats.points);

  return (
    <div className="space-y-6 pb-4">
      <ProfileHeader
        profile={profile}
        stats={stats}
        rank={rank}
        avatar={<EditableAvatar profile={profile} />}
        action={<EditProfileButton profile={profile} />}
      />

      <ProfileTabs
        timeline={
          <CheckInTimeline
            checkIns={timeline}
            emptyLabel="You haven't checked in anywhere yet — start your food history!"
          />
        }
        badges={<BadgesGrid stats={stats} />}
        friends={
          <FriendsTab
            friends={friends}
            incoming={pending.incoming}
            outgoing={pending.outgoing}
          />
        }
      />

      <p className="sr-only">{displayNameOf(profile)}&apos;s profile</p>
    </div>
  );
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getProfilesByIds } from "@/lib/profiles/queries";
import { mapProfileRow, type PublicProfile, type PublicProfileRow } from "@/lib/profiles/types";
import type { FriendStatus, FriendWithProfile } from "@/lib/friends/types";

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
}

async function myFriendships(userId: string): Promise<FriendshipRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

/** User ids of accepted friends (used to scope feed / map / leaderboard). */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await myFriendships(userId);
  return rows
    .filter((r) => r.status === "accepted")
    .map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
}

/** Accepted friends with their public profiles. */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  const rows = (await myFriendships(userId)).filter((r) => r.status === "accepted");
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  const profiles = await getProfilesByIds(otherIds);
  return rows
    .map((r) => {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const profile = profiles.get(otherId);
      if (!profile) return null;
      return {
        edge: { id: r.id, status: r.status, requesterId: r.requester_id, addresseeId: r.addressee_id },
        profile,
        direction: "mutual" as const,
      };
    })
    .filter(Boolean) as FriendWithProfile[];
}

/** Pending requests, split into incoming (to act on) and outgoing (sent). */
export async function getPendingRequests(userId: string): Promise<{
  incoming: FriendWithProfile[];
  outgoing: FriendWithProfile[];
}> {
  const rows = (await myFriendships(userId)).filter((r) => r.status === "pending");
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  const profiles = await getProfilesByIds(otherIds);
  const incoming: FriendWithProfile[] = [];
  const outgoing: FriendWithProfile[] = [];
  for (const r of rows) {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const profile = profiles.get(otherId);
    if (!profile) continue;
    const direction = r.addressee_id === userId ? "incoming" : "outgoing";
    const entry: FriendWithProfile = {
      edge: { id: r.id, status: r.status, requesterId: r.requester_id, addresseeId: r.addressee_id },
      profile,
      direction,
    };
    (direction === "incoming" ? incoming : outgoing).push(entry);
  }
  return { incoming, outgoing };
}

/** Relationship + edge id between the current user and another user. */
export async function getFriendshipWith(
  userId: string,
  otherId: string,
): Promise<{ status: FriendStatus; edgeId: string | null }> {
  if (userId === otherId) return { status: "none", edgeId: null };
  const rows = await myFriendships(userId);
  const edge = rows.find(
    (r) =>
      (r.requester_id === userId && r.addressee_id === otherId) ||
      (r.requester_id === otherId && r.addressee_id === userId),
  );
  if (!edge) return { status: "none", edgeId: null };
  if (edge.status === "accepted") return { status: "friends", edgeId: edge.id };
  const status: FriendStatus = edge.requester_id === userId ? "outgoing" : "incoming";
  return { status, edgeId: edge.id };
}

/** Search users by display name or username (excludes self). */
export async function searchUsers(query: string, userId: string): Promise<PublicProfile[]> {
  const q = query.trim();
  if (!isSupabaseConfigured || q.length < 2) return [];
  const supabase = await createClient();
  // In PostgREST .or() filters the ilike wildcard is `*` (not `%`). Strip chars
  // that would break the comma-separated or() grammar.
  const term = q.replace(/[%_*(),]/g, "");
  if (!term) return [];
  const pattern = `*${term}*`;
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
    .neq("id", userId)
    .limit(12);
  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[]).map(mapProfileRow);
}

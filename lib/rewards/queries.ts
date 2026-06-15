import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAcceptedFriendIds } from "@/lib/friends/queries";
import type { CheckInStatRow } from "@/lib/rewards/compute";

/** A row of the public leaderboard (mirrors the user_check_in_stats view). */
export interface LeaderboardRow {
  user_id: string;
  author_name: string | null;
  avatar_url: string | null;
  check_ins: number;
  venues: number;
  days: number;
  areas: number;
  points: number;
}

/** Every check-in belonging to one user (minimal fields for stats). */
export async function getUserCheckInRows(userId: string): Promise<CheckInStatRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("created_at, venue_name, area, cuisine, rating")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as CheckInStatRow[];
}

/** Top users by points, for the public leaderboard. */
export async function getLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_check_in_stats")
    .select("*")
    .order("points", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

/** Leaderboard scoped to the user + their accepted friends, by points. */
export async function getFriendsLeaderboard(userId: string): Promise<LeaderboardRow[]> {
  if (!isSupabaseConfigured) return [];
  const friendIds = await getAcceptedFriendIds(userId);
  const ids = [userId, ...friendIds];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_check_in_stats")
    .select("*")
    .in("user_id", ids)
    .order("points", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

/** 1-based rank for a points total (count of users strictly above + 1). */
export async function getUserRank(points: number): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_check_in_stats")
    .select("user_id", { count: "exact", head: true })
    .gt("points", points);
  if (error) throw error;
  return (count ?? 0) + 1;
}

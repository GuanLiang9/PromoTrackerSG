import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mapRowToCheckIn, type CheckIn, type CheckInRow } from "@/lib/checkins/types";

/** Most recent public check-ins, newest first — for the community feed. */
export async function getRecentCheckIns(limit = 100): Promise<CheckIn[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as CheckInRow[]).map(mapRowToCheckIn);
}

/** All check-ins with coordinates (every row has them), for the map layer. */
export async function getCheckInsWithCoords(limit = 500): Promise<CheckIn[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as CheckInRow[]).map(mapRowToCheckIn);
}

/** All of one user's check-ins, newest first — for their profile timeline. */
export async function getUserCheckIns(userId: string, limit = 200): Promise<CheckIn[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as CheckInRow[]).map(mapRowToCheckIn);
}

/** A single check-in by id (RLS-gated), or null if not visible / not found. */
export async function getCheckInById(id: string): Promise<CheckIn | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRowToCheckIn(data as CheckInRow) : null;
}

/** Current user id, or null when signed out. */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

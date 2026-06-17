import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mapProfileRow, type PublicProfile, type PublicProfileRow } from "@/lib/profiles/types";

/** Public-facing profile for any user (display name / avatar / bio). */
export async function getProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data as PublicProfileRow) : null;
}

/** Public profiles for many users, keyed by id (for feeds / leaderboards). */
export async function getProfilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (!isSupabaseConfigured || ids.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .in("id", Array.from(new Set(ids)));
  if (error) throw error;
  for (const row of (data ?? []) as PublicProfileRow[]) {
    map.set(row.id, mapProfileRow(row));
  }
  return map;
}

/** Minimal author info for rendering avatars/names in feeds (client-safe, serializable). */
export interface AuthorInfo {
  avatarUrl: string | null;
  displayName: string | null;
}

/** Build a `userId → {avatarUrl, displayName}` record for a set of authored rows. */
export async function getAuthorsFor(
  rows: { userId: string }[],
): Promise<Record<string, AuthorInfo>> {
  const profiles = await getProfilesByIds(rows.map((r) => r.userId));
  const out: Record<string, AuthorInfo> = {};
  for (const [id, p] of profiles) {
    out[id] = { avatarUrl: p.avatarUrl, displayName: p.displayName };
  }
  return out;
}

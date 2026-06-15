"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeStats, type CheckInStatRow } from "@/lib/rewards/compute";
import { computeRewardDelta, type RewardDelta } from "@/lib/rewards/delta";

export interface CheckInInput {
  venueName: string;
  authorName: string;
  note?: string;
  rating?: number | null;
  cuisine?: string | null;
  area?: string | null;
  latitude: number;
  longitude: number;
}

export interface CheckInResult {
  ok: boolean;
  error?: string;
  reward?: RewardDelta;
}

// Singapore bounding box (generous) — rejects coords from elsewhere.
const SG_BOUNDS = { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Records a public check-in for the signed-in user. */
export async function createCheckIn(input: CheckInInput): Promise<CheckInResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to check in." };

  const venueName = clampStr(input.venueName, 120);
  if (!venueName) return { ok: false, error: "Enter the venue name." };

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < SG_BOUNDS.minLat || lat > SG_BOUNDS.maxLat ||
    lng < SG_BOUNDS.minLng || lng > SG_BOUNDS.maxLng
  ) {
    return { ok: false, error: "Pick a location within Singapore." };
  }

  let rating: number | null = null;
  if (input.rating != null) {
    const r = Math.trunc(Number(input.rating));
    if (Number.isFinite(r) && r >= 1 && r <= 5) rating = r;
  }

  const authorName = clampStr(input.authorName, 40) || "Foodie";
  const note = clampStr(input.note, 500) || null;
  const cuisine = clampStr(input.cuisine, 30) || null;
  const area = clampStr(input.area, 80) || null;

  // Snapshot stats BEFORE the insert so we can detect what this check-in unlocks.
  const { data: prevRows } = await supabase
    .from("check_ins")
    .select("created_at, venue_name, area, cuisine, rating")
    .eq("user_id", user.id);
  const prevStats = computeStats((prevRows ?? []) as CheckInStatRow[]);

  const newRow = {
    created_at: new Date().toISOString(),
    venue_name: venueName,
    area,
    cuisine,
    rating,
  } satisfies CheckInStatRow;

  const { error } = await supabase.from("check_ins").insert({
    user_id: user.id, // from session — never trust the client (audit §4.2)
    author_name: authorName,
    venue_name: venueName,
    note,
    rating,
    cuisine,
    area,
    latitude: lat,
    longitude: lng,
  });
  if (error) return { ok: false, error: error.message };

  // Compute the reward delta and persist newly earned badges.
  const reward = await applyRewards(supabase, user.id, prevStats, [
    ...((prevRows ?? []) as CheckInStatRow[]),
    newRow,
  ]);

  revalidatePath("/spots");
  revalidatePath("/map");
  revalidatePath("/dashboard");
  revalidatePath("/rewards");
  revalidatePath("/profile");
  return { ok: true, reward };
}

/** Persists newly earned badges and returns the celebration payload. */
async function applyRewards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  prevStats: ReturnType<typeof computeStats>,
  allRows: CheckInStatRow[],
): Promise<RewardDelta> {
  const nextStats = computeStats(allRows);
  const { data: badgeRows } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);
  const persisted = new Set((badgeRows ?? []).map((b: { badge_id: string }) => b.badge_id));

  const { delta, badgeIdsToInsert } = computeRewardDelta(prevStats, nextStats, persisted);
  if (badgeIdsToInsert.length) {
    await supabase
      .from("user_badges")
      .upsert(
        badgeIdsToInsert.map((badge_id) => ({ user_id: userId, badge_id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
  }
  return delta;
}

/** Deletes the user's own check-in (RLS enforces ownership). */
export async function deleteCheckIn(id: string): Promise<CheckInResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.from("check_ins").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/spots");
  revalidatePath("/map");
  return { ok: true };
}

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

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** True for a finite coordinate within valid earth bounds. */
function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
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
  if (!validCoords(lat, lng)) {
    return { ok: false, error: "Pick a valid location on the map." };
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

/**
 * Updates the user's own check-in (RLS enforces ownership). Editing does NOT
 * grant rewards — points/badges come from new check-ins only.
 */
export async function updateCheckIn(id: string, input: CheckInInput): Promise<CheckInResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const venueName = clampStr(input.venueName, 120);
  if (!venueName) return { ok: false, error: "Enter the venue name." };

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!validCoords(lat, lng)) {
    return { ok: false, error: "Pick a valid location on the map." };
  }

  let rating: number | null = null;
  if (input.rating != null) {
    const r = Math.trunc(Number(input.rating));
    if (Number.isFinite(r) && r >= 1 && r <= 5) rating = r;
  }

  const { error } = await supabase
    .from("check_ins")
    .update({
      author_name: clampStr(input.authorName, 40) || "Foodie",
      venue_name: venueName,
      note: clampStr(input.note, 500) || null,
      rating,
      cuisine: clampStr(input.cuisine, 30) || null,
      area: clampStr(input.area, 80) || null,
      latitude: lat,
      longitude: lng,
    })
    .eq("id", id)
    .eq("user_id", user.id); // belt-and-suspenders alongside RLS
  if (error) return { ok: false, error: error.message };

  revalidatePath("/spots");
  revalidatePath("/map");
  revalidatePath("/profile");
  return { ok: true };
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

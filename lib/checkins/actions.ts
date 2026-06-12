"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/spots");
  revalidatePath("/map");
  revalidatePath("/dashboard");
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

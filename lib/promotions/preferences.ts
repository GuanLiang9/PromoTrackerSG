"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface UserPreferences {
  interests: string[];
  homeLat: number | null;
  homeLng: number | null;
}

/** Read the current user's preferences (empty when signed out). */
export async function getUserPreferences(): Promise<UserPreferences | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_preferences")
    .select("interests, home_lat, home_lng")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    interests: data?.interests ?? [],
    homeLat: data?.home_lat ?? null,
    homeLng: data?.home_lng ?? null,
  };
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/** Upsert the current user's interests. */
export async function saveInterests(interests: string[]): Promise<SaveResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Not configured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, interests }, { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/interests");
  return { ok: true };
}

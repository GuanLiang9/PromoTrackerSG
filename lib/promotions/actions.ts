"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ToggleSavedResult {
  ok: boolean;
  saved?: boolean;
  error?: string;
}

/**
 * Bookmarks / unbookmarks a promotion for the signed-in user. RLS ensures a
 * user can only touch their own rows.
 */
export async function toggleSaved(
  promotionId: string,
): Promise<ToggleSavedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to save promotions." };
  }

  const { data: existing } = await supabase
    .from("saved_promotions")
    .select("id")
    .eq("user_id", user.id)
    .eq("promotion_id", promotionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_promotions")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePathsForSaved();
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("saved_promotions")
    .insert({ user_id: user.id, promotion_id: promotionId });
  if (error) return { ok: false, error: error.message };

  revalidatePathsForSaved();
  return { ok: true, saved: true };
}

function revalidatePathsForSaved() {
  revalidatePath("/dashboard");
  revalidatePath("/saved");
}

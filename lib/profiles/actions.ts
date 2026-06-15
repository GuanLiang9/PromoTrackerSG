"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileActionResult {
  ok: boolean;
  error?: string;
  avatarUrl?: string;
}

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Update the signed-in user's profile (display name, bio, username). */
export async function updateProfile(input: {
  displayName: string;
  bio?: string;
  username?: string;
}): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const displayName = clampStr(input.displayName, 40);
  if (!displayName) return { ok: false, error: "Enter a display name." };

  const bio = clampStr(input.bio, 160) || null;
  const cleaned = clampStr(input.username, 24).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const username: string | null = cleaned || null;
  if (username && username.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters (letters, numbers, _)." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio, username })
    .eq("id", user.id);

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? "That username is already taken."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/profile");
  return { ok: true };
}

/** Upload an avatar image to the `avatars` bucket and save its public URL. */
export async function uploadAvatar(formData: FormData): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Avatar must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be under 5 MB." };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  // Cache-busting filename keeps a single object per user but updates the URL.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = pub.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/profile");
  return { ok: true, avatarUrl };
}

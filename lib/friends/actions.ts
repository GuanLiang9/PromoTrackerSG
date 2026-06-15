"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchUsers, getFriendshipWith } from "@/lib/friends/queries";
import type { PublicProfile } from "@/lib/profiles/types";
import type { FriendStatus } from "@/lib/friends/types";

export interface FriendActionResult {
  ok: boolean;
  error?: string;
}

export interface UserSearchHit {
  profile: PublicProfile;
  status: FriendStatus;
  edgeId: string | null;
}

/** Search users by name/username and annotate each with friend status. */
export async function findUsers(query: string): Promise<UserSearchHit[]> {
  const { user } = await requireUser();
  if (!user) return [];
  const profiles = await searchUsers(query, user.id);
  return Promise.all(
    profiles.map(async (profile) => {
      const { status, edgeId } = await getFriendshipWith(user.id, profile.id);
      return { profile, status, edgeId };
    }),
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Send a friend request (or auto-accept if the other person already invited you). */
export async function sendFriendRequest(addresseeId: string): Promise<FriendActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (addresseeId === user.id) return { ok: false, error: "You can't add yourself." };

  // If they already sent us a pending request, accept it instead of duplicating.
  const { data: reverse } = await supabase
    .from("friendships")
    .select("id, status")
    .eq("requester_id", addresseeId)
    .eq("addressee_id", user.id)
    .maybeSingle();
  if (reverse) {
    if (reverse.status === "accepted") return { ok: true };
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", reverse.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    return { ok: true };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? "You've already sent a request to this person."
      : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath("/profile");
  return { ok: true };
}

/** Accept an incoming request (only the addressee may accept). */
export async function acceptFriendRequest(edgeId: string): Promise<FriendActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", edgeId)
    .eq("addressee_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

/** Remove a friend, decline an incoming request, or cancel an outgoing one. */
export async function removeFriend(edgeId: string): Promise<FriendActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.from("friendships").delete().eq("id", edgeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

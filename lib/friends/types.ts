import type { PublicProfile } from "@/lib/profiles/types";

export type FriendStatus = "none" | "friends" | "incoming" | "outgoing";

export interface FriendEdge {
  id: string;
  status: "pending" | "accepted";
  requesterId: string;
  addresseeId: string;
}

/** A friend (or pending request) paired with the other person's profile. */
export interface FriendWithProfile {
  edge: FriendEdge;
  profile: PublicProfile;
  /** Direction relative to the current user (for pending requests). */
  direction: "incoming" | "outgoing" | "mutual";
}

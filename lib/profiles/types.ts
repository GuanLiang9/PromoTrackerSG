/** A public-facing profile row (from the public_profiles view). */
export interface PublicProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  username: string | null;
  isPublic: boolean;
}

export interface PublicProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  is_public: boolean | null;
}

export function mapProfileRow(r: PublicProfileRow): PublicProfile {
  return {
    id: r.id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    bio: r.bio,
    username: r.username,
    isPublic: Boolean(r.is_public),
  };
}

/** Best display name for a profile, with a sensible fallback. */
export function displayNameOf(p: Pick<PublicProfile, "displayName" | "username">): string {
  return p.displayName?.trim() || p.username?.trim() || "Foodie";
}

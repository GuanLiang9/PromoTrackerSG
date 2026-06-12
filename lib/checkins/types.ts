import type { CuisineType } from "@/lib/food/spots";

/** A row from the `check_ins` table (snake_case, as returned by Supabase). */
export interface CheckInRow {
  id: string;
  user_id: string;
  author_name: string;
  venue_name: string;
  note: string | null;
  rating: number | null;
  cuisine: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

/** View model used throughout the UI. */
export interface CheckIn {
  id: string;
  userId: string;
  authorName: string;
  venueName: string;
  note: string | null;
  rating: number | null;
  cuisine: CuisineType | null;
  area: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export function mapRowToCheckIn(r: CheckInRow): CheckIn {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    venueName: r.venue_name,
    note: r.note,
    rating: r.rating,
    cuisine: (r.cuisine as CuisineType | null) ?? null,
    area: r.area,
    latitude: r.latitude,
    longitude: r.longitude,
    createdAt: r.created_at,
  };
}

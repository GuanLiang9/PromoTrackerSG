import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedPromotion } from "@/lib/ingestion/pipeline";

const DAY = 24 * 60 * 60 * 1000;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Maps a normalized promotion to a `promotions` row. Promotions without explicit
 * dates default to a 30-day window starting today so they stay visible on the
 * calendar; end_date is always clamped to be >= start_date.
 */
export function toRow(p: NormalizedPromotion) {
  const today = new Date();
  const start = p.startDate ?? toDateKey(today);
  let end = p.endDate ?? toDateKey(new Date(today.getTime() + 30 * DAY));
  if (end < start) end = start;
  // Clamp end_date: if it's already in the past keep start but push end to
  // at least today so the promotion stays visible (handles mis-extracted dates).
  // If both start AND end are clearly in the past (>14 days ago), skip entirely
  // — the caller filters these out before upsert.
  const cutoff = toDateKey(new Date(today.getTime() - 14 * DAY));
  if (end < cutoff) return null; // signal: skip this row

  const tags = Array.from(new Set([...p.tags, "ingested"]));

  return {
    title: p.title,
    description: p.description,
    category: p.category,
    start_date: start,
    end_date: end,
    location: p.location,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    image_url: p.imageUrl,
    source_name: p.sourceName,
    source_url: p.sourceUrl,
    tags,
    status: "active" as const,
    dedupe_key: p.dedupeKey,
    external_id: p.externalId,
  };
}

export interface UpsertResult {
  attempted: number;
  saved: number;
  error?: string;
}

/**
 * Upserts normalized promotions, deduping on `dedupe_key`. Requires a
 * service-role client (RLS would otherwise block inserts).
 */
export async function upsertPromotions(
  supabase: SupabaseClient,
  promotions: NormalizedPromotion[],
): Promise<UpsertResult> {
  if (promotions.length === 0) return { attempted: 0, saved: 0 };

  const rows = promotions.map(toRow).filter((r): r is NonNullable<typeof r> => r !== null);
  const { data, error } = await supabase
    .from("promotions")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: false })
    .select("id");

  if (error) {
    return { attempted: rows.length, saved: 0, error: error.message };
  }
  return { attempted: rows.length, saved: data?.length ?? 0 };
}

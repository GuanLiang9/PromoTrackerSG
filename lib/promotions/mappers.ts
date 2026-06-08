import type { Promotion, PromotionRow } from "@/lib/types";

/** Converts a snake_case DB row into the camelCase UI view model. */
export function mapRowToPromotion(
  row: PromotionRow,
  savedIds?: Set<string>,
): Promotion {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    tags: row.tags ?? [],
    terms: row.terms,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSaved: savedIds ? savedIds.has(row.id) : undefined,
  };
}

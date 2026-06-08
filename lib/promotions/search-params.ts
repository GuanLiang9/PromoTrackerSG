import type { PromoCategory, PromotionFilters, PromotionSort } from "@/lib/types";
import { CATEGORY_META } from "@/lib/constants";

type SearchParams = Record<string, string | string[] | undefined>;

const SORTS: PromotionSort[] = ["today", "newest", "ending", "trending"];

function isCategory(value: string): value is PromoCategory {
  return value in CATEGORY_META;
}

function isSort(value: string | undefined): value is PromotionSort {
  return value !== undefined && (SORTS as string[]).includes(value);
}

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/** Parses URL search params into typed, validated promotion filters. */
export function parsePromotionFilters(params: SearchParams): PromotionFilters {
  const categoriesRaw = params.category ?? params.categories;
  const categories = (
    Array.isArray(categoriesRaw)
      ? categoriesRaw
      : typeof categoriesRaw === "string"
        ? categoriesRaw.split(",")
        : []
  )
    .map((c) => c.trim())
    .filter(isCategory);

  const sortRaw = first(params.sort);

  return {
    query: first(params.q ?? params.query),
    categories: categories.length > 0 ? categories : undefined,
    from: first(params.from),
    to: first(params.to),
    location: first(params.location),
    sort: isSort(sortRaw) ? sortRaw : undefined,
  };
}

/** Serialises filters back into a URLSearchParams query string. */
export function serializeFilters(filters: PromotionFilters): string {
  const sp = new URLSearchParams();
  if (filters.query) sp.set("q", filters.query);
  if (filters.categories && filters.categories.length > 0) {
    sp.set("category", filters.categories.join(","));
  }
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.location) sp.set("location", filters.location);
  if (filters.sort) sp.set("sort", filters.sort);
  return sp.toString();
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mapRowToPromotion } from "@/lib/promotions/mappers";
import { toDateKey } from "@/lib/calendar/date";
import { categoriesForInterests } from "@/lib/constants";
import type {
  Promotion,
  PromotionFilters,
  PromotionRow,
} from "@/lib/types";

const SELECT = "*";

/** IDs the current user has saved (empty set when signed out). */
async function getSavedIds(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("saved_promotions")
    .select("promotion_id")
    .eq("user_id", user.id);

  return new Set((data ?? []).map((r) => r.promotion_id as string));
}

/** Active promotions overlapping [from, to] (inclusive), for the calendar. */
export async function getPromotionsInRange(
  from: Date,
  to: Date,
): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const savedIds = await getSavedIds();

  const { data, error } = await supabase
    .from("promotions")
    .select(SELECT)
    .eq("status", "active")
    .lte("start_date", toDateKey(to))
    .gte("end_date", toDateKey(from))
    .order("start_date", { ascending: true });

  if (error) throw error;
  return (data as PromotionRow[]).map((r) => mapRowToPromotion(r, savedIds));
}

/** Active promotions that have coordinates, for the map view. */
export async function getPromotionsWithCoords(): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const savedIds = await getSavedIds();

  const { data, error } = await supabase
    .from("promotions")
    .select(SELECT)
    .eq("status", "active")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(500);

  if (error) throw error;
  return (data as PromotionRow[]).map((r) => mapRowToPromotion(r, savedIds));
}

export async function getPromotionById(
  id: string,
): Promise<Promotion | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const savedIds = await getSavedIds();

  const { data, error } = await supabase
    .from("promotions")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRowToPromotion(data as PromotionRow, savedIds) : null;
}

export interface DashboardSections {
  today: Promotion[];
  newest: Promotion[];
  endingSoon: Promotion[];
  trending: Promotion[];
  saved: Promotion[];
}

/** Fetches the five dashboard sections in a single round of queries. */
export async function getDashboardSections(): Promise<DashboardSections> {
  if (!isSupabaseConfigured) {
    return { today: [], newest: [], endingSoon: [], trending: [], saved: [] };
  }

  const supabase = await createClient();
  const savedIds = await getSavedIds();
  const today = toDateKey(new Date());
  const in3Days = toDateKey(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  );
  const last7Days = toDateKey(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  const base = () =>
    supabase.from("promotions").select(SELECT).eq("status", "active");

  const [todayRes, newRes, endingRes, trendingRes] = await Promise.all([
    base().lte("start_date", today).gte("end_date", today).limit(20),
    // New arrivals + Trending must still be live: floor on end_date so a promo
    // that has already ended never surfaces even before the daily archive runs.
    base()
      .gte("created_at", last7Days)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(12),
    base()
      .gte("end_date", today)
      .lte("end_date", in3Days)
      .order("end_date", { ascending: true })
      .limit(12),
    base().gte("end_date", today).order("created_at", { ascending: false }).limit(12),
  ]);

  const map = (rows: PromotionRow[] | null) =>
    (rows ?? []).map((r) => mapRowToPromotion(r, savedIds));

  let saved: Promotion[] = [];
  if (savedIds.size > 0) {
    const { data } = await base().in("id", Array.from(savedIds)).limit(50);
    saved = map(data as PromotionRow[] | null);
  }

  return {
    today: map(todayRes.data as PromotionRow[] | null),
    newest: map(newRes.data as PromotionRow[] | null),
    endingSoon: map(endingRes.data as PromotionRow[] | null),
    trending: map(trendingRes.data as PromotionRow[] | null),
    saved,
  };
}

/** Full-text + faceted search. */
export async function searchPromotions(
  filters: PromotionFilters,
): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const savedIds = await getSavedIds();

  let q = supabase.from("promotions").select(SELECT).eq("status", "active");

  if (filters.query) {
    q = q.textSearch("search_vector", filters.query, {
      type: "websearch",
      config: "english",
    });
  }
  if (filters.categories && filters.categories.length > 0) {
    q = q.in("category", filters.categories);
  }
  if (filters.from) q = q.gte("end_date", filters.from);
  if (filters.to) q = q.lte("start_date", filters.to);
  if (filters.location) q = q.ilike("location", `%${filters.location}%`);

  // The `sort` value mirrors a dashboard section: it applies a date window
  // and ordering that match getDashboardSections() exactly.
  const today = toDateKey(new Date());
  switch (filters.sort) {
    case "today":
      q = q
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: true });
      break;
    case "newest": {
      const last7Days = toDateKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      q = q
        .gte("created_at", last7Days)
        .gte("end_date", today)
        .order("created_at", { ascending: false });
      break;
    }
    case "ending": {
      const in3Days = toDateKey(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
      q = q
        .gte("end_date", today)
        .lte("end_date", in3Days)
        .order("end_date", { ascending: true });
      break;
    }
    case "trending":
      q = q.gte("end_date", today).order("created_at", { ascending: false });
      break;
    default:
      q = q.gte("end_date", today).order("start_date", { ascending: true });
  }

  const { data, error } = await q.limit(100);

  if (error) throw error;
  return (data as PromotionRow[]).map((r) => mapRowToPromotion(r, savedIds));
}

/**
 * Personalized "Recommended For You". For a signed-in user we rank active
 * promotions by base_score, boosting those matching the user's chosen interests
 * and the categories they've previously saved. Anonymous users (or users with
 * no signal) get the top-scored deals as a sensible fallback.
 */
export async function getRecommendations(limit = 12): Promise<{
  promotions: Promotion[];
  personalized: boolean;
}> {
  if (!isSupabaseConfigured) return { promotions: [], personalized: false };
  const supabase = await createClient();
  const savedIds = await getSavedIds();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gather interest + saved-category signal.
  let interestCats: string[] = [];
  if (user) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("interests")
      .eq("user_id", user.id)
      .maybeSingle();
    interestCats = categoriesForInterests(prefs?.interests ?? []);
  }
  const savedCats = new Set<string>();
  if (savedIds.size > 0) {
    const { data: savedRows } = await supabase
      .from("promotions")
      .select("category")
      .in("id", Array.from(savedIds));
    (savedRows ?? []).forEach((r) => savedCats.add(r.category as string));
  }

  // Pull a generous pool of top-scored active deals, then re-rank locally.
  const { data, error } = await supabase
    .from("promotions")
    .select(SELECT)
    .eq("status", "active")
    .order("base_score", { ascending: false, nullsFirst: false })
    .limit(60);
  if (error) throw error;

  const pool = (data as PromotionRow[]).map((r) => mapRowToPromotion(r, savedIds));
  const signal = interestCats.length > 0 || savedCats.size > 0;

  const ranked = pool
    .filter((p) => !p.isSaved)
    .map((p) => {
      let boost = 0;
      if (interestCats.includes(p.category)) boost += 30;
      if (savedCats.has(p.category)) boost += 15;
      return { p, rank: (p.baseScore ?? 0) + boost };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((x) => x.p);

  return { promotions: ranked, personalized: Boolean(user && signal) };
}

/** Upcoming + currently-running active promotions for the Timeline view. */
export async function getUpcomingPromotions(
  days = 60,
  categories?: string[],
): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const savedIds = await getSavedIds();
  const today = toDateKey(new Date());
  const until = toDateKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

  let q = supabase
    .from("promotions")
    .select(SELECT)
    .eq("status", "active")
    .gte("end_date", today) // still running or future
    .lte("start_date", until) // starts within the window
    .order("start_date", { ascending: true })
    .limit(200);

  if (categories && categories.length > 0) q = q.in("category", categories);

  const { data, error } = await q;
  if (error) throw error;
  return (data as PromotionRow[]).map((r) => mapRowToPromotion(r, savedIds));
}

export interface DailySummary {
  food?: string;
  shopping?: string;
  family?: string;
}

/** Today's cached AI/template deal summary (public read). */
export async function getDailySummary(): Promise<DailySummary | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const today = toDateKey(new Date());
  const { data } = await supabase
    .from("daily_summaries")
    .select("content")
    .eq("summary_date", today)
    .maybeSingle();
  return (data?.content as DailySummary) ?? null;
}

export async function getSavedPromotions(): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_promotions")
    .select("promotion:promotions(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? [])
    .map((r) => (r as unknown as { promotion: PromotionRow | null }).promotion)
    .filter((p): p is PromotionRow => p !== null);
  const savedIds = new Set(rows.map((r) => r.id));
  return rows.map((r) => mapRowToPromotion(r, savedIds));
}

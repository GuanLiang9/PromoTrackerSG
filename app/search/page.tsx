import type { Metadata } from "next";
import { SearchControls } from "@/components/search/search-controls";
import { PromoGrid } from "@/components/promotions/promo-list";
import { SetupNotice } from "@/components/layout/setup-notice";
import { parsePromotionFilters } from "@/lib/promotions/search-params";
import { searchPromotions } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

const SORT_LABELS: Record<string, string> = {
  today: "Today’s promotions",
  newest: "New",
  ending: "Ending soon",
  trending: "Trending",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parsePromotionFilters(sp);
  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && (!Array.isArray(v) || v.length > 0),
  );
  const results = hasFilters ? await searchPromotions(filters) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find promotions by keyword, category, date or location.
        </p>
      </div>

      <SearchControls initial={filters} />

      {!isSupabaseConfigured && <SetupNotice />}

      {hasFilters ? (
        <>
          {filters.sort && (
            <h2 className="text-lg font-bold tracking-tight">
              {SORT_LABELS[filters.sort]}
            </h2>
          )}
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <PromoGrid promotions={results} empty="No promotions match your filters." />
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Enter a keyword or pick a filter to start searching.
        </p>
      )}
    </div>
  );
}

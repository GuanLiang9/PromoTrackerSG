import type { Metadata } from "next";
import { PromoGrid } from "@/components/promotions/promo-list";
import { TimelineFilter } from "@/components/timeline/timeline-filter";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getUpcomingPromotions } from "@/lib/promotions/queries";
import { parsePromotionFilters } from "@/lib/promotions/search-params";
import { bucketTimeline } from "@/lib/timeline/buckets";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Timeline" };
export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parsePromotionFilters(params);
  const categories = filters.categories ?? [];

  const promotions = isSupabaseConfigured
    ? await getUpcomingPromotions(60, categories)
    : [];
  const buckets = bucketTimeline(promotions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Everything coming up — today through the next two months.
        </p>
      </div>

      <TimelineFilter active={categories} />

      {!isSupabaseConfigured && <SetupNotice />}

      {buckets.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing upcoming in this filter.
        </p>
      ) : (
        buckets.map((b) => (
          <section key={b.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">{b.label}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {b.promotions.length}
              </span>
            </div>
            <PromoGrid promotions={b.promotions} />
          </section>
        ))
      )}
    </div>
  );
}

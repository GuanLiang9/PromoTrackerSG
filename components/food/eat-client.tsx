"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { PromoCard } from "@/components/promotions/promo-card";
import { SpotCard } from "@/components/food/spot-card";
import {
  FOOD_SPOTS,
  CUISINE_META,
  PRICE_META,
  type CuisineType,
  type PriceRange,
} from "@/lib/food/spots";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

const CUISINES = Object.entries(CUISINE_META) as [CuisineType, typeof CUISINE_META[CuisineType]][];
const PRICES = Object.entries(PRICE_META) as [PriceRange, typeof PRICE_META[PriceRange]][];

export function EatClient({
  foodDeals,
  initialCuisine = null,
  initialPrice = null,
}: {
  foodDeals: Promotion[];
  initialCuisine?: CuisineType | null;
  initialPrice?: PriceRange | null;
}) {
  const [cuisine, setCuisine] = React.useState<CuisineType | null>(initialCuisine);
  const [price, setPrice] = React.useState<PriceRange | null>(initialPrice);

  const filtered = React.useMemo(
    () =>
      FOOD_SPOTS.filter(
        (s) =>
          (!cuisine || s.cuisine === cuisine) &&
          (!price || s.priceRange === price),
      ),
    [cuisine, price],
  );

  return (
    <div className="space-y-8 pb-4">
      {/* Back + heading */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 left-24 h-32 w-32 rounded-full bg-amber-400/8 blur-2xl" />
          <div className="relative space-y-2">
            <div className="text-3xl">🇸🇬</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Where to Eat in Singapore
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Hawker classics, restaurant hidden gems, cafés and live food deals — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Cuisine filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cuisine
        </p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setCuisine(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              cuisine === null
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30",
            )}
          >
            All
          </button>
          {CUISINES.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCuisine(cuisine === key ? null : key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                cuisine === key
                  ? cn(meta.bg, "border-transparent")
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price filter */}
      <div className="flex items-center gap-2">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Budget
        </p>
        <div className="flex gap-2">
          {PRICES.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPrice(price === key ? null : key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                price === key
                  ? cn(meta.badge, "border-transparent")
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live food deals from DB */}
      {foodDeals.length > 0 && !cuisine && !price && (
        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand" />
            <h2 className="text-base font-semibold tracking-tight">Live food deals</h2>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
              {foodDeals.length}
            </span>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {foodDeals.map((p) => (
              <div key={p.id} className="w-64 shrink-0 snap-start">
                <PromoCard promotion={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curated spots */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {cuisine || price
              ? `${filtered.length} spot${filtered.length === 1 ? "" : "s"} found`
              : `${filtered.length} curated spots`}
          </h2>
          {(cuisine || price) && (
            <button
              type="button"
              onClick={() => { setCuisine(null); setPrice(null); }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No spots match these filters — try clearing one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

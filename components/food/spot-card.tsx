"use client";

import { MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { CUISINE_META, PRICE_META } from "@/lib/food/spots";
import { cn } from "@/lib/utils";
import type { FoodSpot } from "@/lib/food/spots";

export function SpotCard({ spot }: { spot: FoodSpot }) {
  const [expanded, setExpanded] = useState(false);
  const cuisine = CUISINE_META[spot.cuisine];
  const price = PRICE_META[spot.priceRange];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-md">
      {/* Colour header with emoji */}
      <div className={cn("flex h-24 items-center justify-center", cuisine.bg)}>
        <span className="text-5xl">{cuisine.emoji}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Name + badges */}
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="flex-1 text-sm font-semibold leading-snug">{spot.name}</h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", cuisine.bg)}>
            {cuisine.emoji} {cuisine.label}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", price.badge)}>
            {price.label} · {spot.priceLabel}
          </span>
        </div>

        {/* Area */}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {spot.area}
        </p>

        {/* Description (collapsed by default on mobile) */}
        <p className={cn("text-xs text-muted-foreground leading-relaxed", !expanded && "line-clamp-2")}>
          {spot.description}
        </p>

        {/* Must try */}
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Must try
          </p>
          <ul className="space-y-0.5">
            {spot.mustTry.map((dish) => (
              <li key={dish} className="flex items-start gap-1.5 text-xs">
                <span className="mt-0.5 text-brand">•</span>
                {dish}
              </li>
            ))}
          </ul>
        </div>

        {/* Tip (only when expanded) */}
        {expanded && spot.tip && (
          <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
            <span className="font-semibold">💡 Tip: </span>{spot.tip}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <a
            href={spot.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Directions
          </a>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted"
            aria-label={expanded ? "Show less" : "Show more"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

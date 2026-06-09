import { MapPin, ExternalLink } from "lucide-react";
import { CUISINE_META, PRICE_META } from "@/lib/food/spots";
import { cn } from "@/lib/utils";
import type { FoodSpot } from "@/lib/food/spots";

export function SpotCard({ spot }: { spot: FoodSpot }) {
  const cuisine = CUISINE_META[spot.cuisine];
  const price = PRICE_META[spot.priceRange];
  // Always show exactly 3 must-try items so every card has the same content height
  const topDishes = spot.mustTry.slice(0, 3);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-md">
      {/* Colour header — fixed height */}
      <div className={cn("flex h-24 shrink-0 items-center justify-center", cuisine.bg)}>
        <span className="text-5xl">{cuisine.emoji}</span>
      </div>

      {/* Body — flex-1 so footer pins to bottom */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{spot.name}</h3>

        {/* Badges */}
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
          <span className="line-clamp-1">{spot.area}</span>
        </p>

        {/* Description — always clamped to 2 lines */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {spot.description}
        </p>

        {/* Must try — always exactly 3 items */}
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Must try
          </p>
          <ul className="space-y-0.5">
            {topDishes.map((dish) => (
              <li key={dish} className="flex items-start gap-1.5 text-xs">
                <span className="mt-0.5 shrink-0 text-brand">•</span>
                <span className="line-clamp-1">{dish}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tip — always 1 line, pinned before the action button */}
        {spot.tip && (
          <p className="line-clamp-1 text-[11px] text-amber-700">
            💡 {spot.tip}
          </p>
        )}

        {/* Action — mt-auto pushes it to the bottom */}
        <a
          href={spot.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Get Directions
        </a>
      </div>
    </div>
  );
}

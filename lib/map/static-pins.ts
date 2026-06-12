export type PinLayer = "food" | "gem" | "spot";

export interface StaticPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  layer: PinLayer;
  emoji: string;
  /** Tailwind bg+text classes for the pin bubble */
  bg: string;
  area: string;
  description: string;
  mapsUrl: string;
  /** Extra label shown in filter chips */
  tag: string;
}

import type { FoodSpot } from "@/lib/food/spots";
import { CUISINE_META } from "@/lib/food/spots";
import type { HiddenGem } from "@/lib/gems/gems";
import { GEM_CATEGORY_META } from "@/lib/gems/gems";
import type { CheckIn } from "@/lib/checkins/types";

export function foodSpotToPin(s: FoodSpot): StaticPin | null {
  if (s.lat == null || s.lng == null) return null;
  const meta = CUISINE_META[s.cuisine];
  return {
    id: `food-${s.id}`,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    layer: "food",
    emoji: meta.emoji,
    bg: meta.bg,
    area: s.area,
    description: s.mustTry.slice(0, 2).join(", "),
    mapsUrl: s.mapsUrl,
    tag: meta.label,
  };
}

export function checkInToPin(c: CheckIn): StaticPin {
  const meta = c.cuisine ? CUISINE_META[c.cuisine] : null;
  return {
    id: `spot-${c.id}`,
    name: c.venueName,
    lat: c.latitude,
    lng: c.longitude,
    layer: "spot",
    emoji: meta?.emoji ?? "🍴",
    bg: meta?.bg ?? "bg-zinc-100 text-zinc-800",
    area: c.area ?? "Singapore",
    description: c.note ?? `Checked in by ${c.authorName}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`,
    tag: meta?.label ?? "Community spot",
  };
}

export function gemToPin(g: HiddenGem): StaticPin {
  const meta = GEM_CATEGORY_META[g.category];
  return {
    id: `gem-${g.id}`,
    name: g.name,
    lat: g.lat,
    lng: g.lng,
    layer: "gem",
    emoji: meta.emoji,
    bg: meta.bg,
    area: g.area,
    description: g.description,
    mapsUrl: g.mapsUrl,
    tag: meta.label,
  };
}

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PromoCategory, Promotion } from "@/lib/types";

// Leaflet touches `window`, so the map must be client-only (no SSR).
const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function MapRoot({ promotions }: { promotions: Promotion[] }) {
  const [active, setActive] = React.useState<Set<PromoCategory>>(new Set());

  const visible = React.useMemo(
    () =>
      active.size === 0
        ? promotions
        : promotions.filter((p) => active.has(p.category)),
    [promotions, active],
  );

  function toggle(cat: PromoCategory) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-[3.5rem] top-14 z-30 flex flex-col md:static md:bottom-auto md:z-auto md:h-[calc(100dvh-9rem)] md:overflow-hidden md:rounded-xl md:border">
      {/* Category filter chips */}
      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur">
        {CATEGORIES.map((meta) => {
          const on = active.has(meta.value);
          return (
            <button
              key={meta.value}
              type="button"
              onClick={() => toggle(meta.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                on
                  ? meta.badgeClass
                  : "bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {meta.emoji} {meta.short}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1">
        <MapView promotions={visible} />
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow">
          {visible.length} promotion{visible.length === 1 ? "" : "s"} on map
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Crosshair, X } from "lucide-react";
import { CATEGORIES, getCategoryMeta } from "@/lib/constants";
import { formatDateRange } from "@/lib/format";
import { haversineKm } from "@/lib/geo/distance";
import { computeHotZones } from "@/lib/geo/zones";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { cn } from "@/lib/utils";
import type { PromoCategory, Promotion } from "@/lib/types";
import type { FlyTarget } from "@/components/map/map-view";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function MapRoot({
  promotions,
  focusId,
}: {
  promotions: Promotion[];
  focusId?: string | null;
}) {
  const [active, setActive] = React.useState<Set<PromoCategory>>(new Set());
  const [selected, setSelected] = React.useState<Promotion | null>(null);
  const [flyTarget, setFlyTarget] = React.useState<FlyTarget | null>(null);
  const [userPos, setUserPos] = React.useState<{ lat: number; lng: number } | null>(null);

  // Focus a specific promo when arriving from a deep link (?id=…)
  React.useEffect(() => {
    if (!focusId) return;
    const p = promotions.find((x) => x.id === focusId);
    if (p?.latitude != null && p.longitude != null) {
      setSelected(p);
      setFlyTarget({ lat: p.latitude, lng: p.longitude, zoom: 16, nonce: Date.now() });
    }
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = React.useMemo(
    () =>
      active.size === 0
        ? promotions
        : promotions.filter((p) => active.has(p.category)),
    [promotions, active],
  );

  const hotZones = React.useMemo(() => computeHotZones(visible), [visible]);

  const onSelect = React.useCallback((p: Promotion) => setSelected(p), []);

  function toggle(cat: PromoCategory) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });
        setFlyTarget({ lat, lng, zoom: 15, nonce: Date.now() });
      },
      undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const selectedDistance =
    selected && userPos && selected.latitude != null && selected.longitude != null
      ? haversineKm(userPos, { lat: selected.latitude, lng: selected.longitude })
      : null;

  return (
    <div className="fixed inset-x-0 bottom-[3.5rem] top-14 z-30 overflow-hidden md:static md:bottom-auto md:z-auto md:h-[calc(100dvh-9rem)] md:rounded-2xl md:border">
      {/* Map fills the whole area */}
      <div className="absolute inset-0">
        <MapView
          promotions={visible}
          onSelect={onSelect}
          flyTarget={flyTarget}
          userPos={userPos}
        />
      </div>

      {/* Floating glass filter bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-3">
        <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto rounded-2xl border border-white/40 bg-white/70 p-2 shadow-lg backdrop-blur-xl">
          {CATEGORIES.map((meta) => {
            const on = active.has(meta.value);
            return (
              <button
                key={meta.value}
                type="button"
                onClick={() => toggle(meta.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on ? meta.badgeClass : "border-transparent bg-white/70 text-zinc-600",
                )}
              >
                {meta.emoji} {meta.short}
              </button>
            );
          })}
        </div>

        {/* Hot zones */}
        {hotZones.length > 0 && (
          <div className="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 rounded-full bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              🔥 Hot zones
            </span>
            {hotZones.map((z) => (
              <button
                key={z.name}
                type="button"
                onClick={() =>
                  setFlyTarget({ lat: z.lat, lng: z.lng, zoom: 14, nonce: Date.now() })
                }
                className="shrink-0 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur"
              >
                {z.name} · {z.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locate-me button */}
      <button
        type="button"
        onClick={locate}
        aria-label="Find my location"
        className="absolute bottom-4 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/80 text-zinc-700 shadow-lg backdrop-blur-xl active:scale-95"
      >
        <Crosshair className="h-5 w-5" />
      </button>

      {/* Count pill */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {visible.length} deal{visible.length === 1 ? "" : "s"}
      </div>

      {/* Apple-style selected card */}
      {selected && (
        <div className="absolute inset-x-3 bottom-4 z-[1001] animate-fade-in-up">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/10 text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
            <Link href={`/promotions/${selected.id}`} className="flex gap-3 p-3">
              {selected.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.imageUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-3xl",
                  getCategoryMeta(selected.category).chipClass,
                )}>
                  {getCategoryMeta(selected.category).emoji}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CategoryBadge category={selected.category} />
                  <ScoreChip score={selected.baseScore} />
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                  {selected.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDateRange(selected.startDate, selected.endDate)}
                  {selectedDistance != null &&
                    ` · ${selectedDistance < 1 ? `${Math.round(selectedDistance * 1000)} m` : `${selectedDistance.toFixed(1)} km`} away`}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

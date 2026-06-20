"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, ExternalLink, Pencil, Search, Star, X } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { CATEGORIES, getCategoryMeta } from "@/lib/constants";
import { formatDateRange } from "@/lib/format";
import { haversineKm } from "@/lib/geo/distance";
import { computeHotZones } from "@/lib/geo/zones";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { cn } from "@/lib/utils";
import type { PromoCategory, Promotion } from "@/lib/types";
import type { FlyTarget } from "@/components/map/map-view";
import type { StaticPin } from "@/lib/map/static-pins";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type MapLayer = "deals" | "food" | "gems" | "spots";

const LAYER_TABS: { value: MapLayer; label: string; emoji: string }[] = [
  { value: "deals", label: "Deals", emoji: "🏷️" },
  { value: "food",  label: "Food",  emoji: "🍜" },
  { value: "gems",  label: "Gems",  emoji: "💎" },
  { value: "spots", label: "Spots", emoji: "📍" },
];

type SpotScope = "all" | "friends" | "mine";

export function MapRoot({
  promotions,
  foodPins,
  gemPins,
  spotPins,
  currentUserId = null,
  friendIds = [],
  focusId,
  focusSpotId,
}: {
  promotions: Promotion[];
  foodPins: StaticPin[];
  gemPins: StaticPin[];
  spotPins: StaticPin[];
  currentUserId?: string | null;
  friendIds?: string[];
  focusId?: string | null;
  focusSpotId?: string | null;
}) {
  const [layer, setLayer] = React.useState<MapLayer>("deals");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [countryFilter, setCountryFilter] = React.useState<"all" | "SG" | "MY">("all");
  const [spotScope, setSpotScope] = React.useState<SpotScope>("all");
  const friendSet = React.useMemo(() => new Set(friendIds), [friendIds]);
  const [activeCategories, setActiveCategories] = React.useState<Set<PromoCategory>>(new Set());
  const [selected, setSelected] = React.useState<Promotion | null>(null);
  const [selectedPin, setSelectedPin] = React.useState<StaticPin | null>(null);
  const [flyTarget, setFlyTarget] = React.useState<FlyTarget | null>(null);
  const [userPos, setUserPos] = React.useState<{ lat: number; lng: number } | null>(null);

  // Deep-link focus on mount — a promotion (?id=) or a community check-in (?spot=).
  React.useEffect(() => {
    if (focusSpotId) {
      const pin = spotPins.find((x) => x.id === `spot-${focusSpotId}`);
      if (pin) {
        setLayer("spots");
        setSelectedPin(pin);
        setFlyTarget({ lat: pin.lat, lng: pin.lng, zoom: 17, nonce: Date.now() });
        return;
      }
    }
    if (focusId) {
      const p = promotions.find((x) => x.id === focusId);
      if (p?.latitude != null && p.longitude != null) {
        setSelected(p);
        setFlyTarget({ lat: p.latitude, lng: p.longitude, zoom: 16, nonce: Date.now() });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleDeals = React.useMemo(
    () =>
      activeCategories.size === 0
        ? promotions
        : promotions.filter((p) => activeCategories.has(p.category)),
    [promotions, activeCategories],
  );

  const hotZones = React.useMemo(() => computeHotZones(visibleDeals), [visibleDeals]);

  const visibleFoodPins = React.useMemo(
    () =>
      countryFilter === "all"
        ? foodPins
        : foodPins.filter((p) => p.country === countryFilter),
    [foodPins, countryFilter],
  );

  const visibleSpotPins = React.useMemo(() => {
    if (spotScope === "mine") return spotPins.filter((p) => p.userId === currentUserId);
    if (spotScope === "friends")
      return spotPins.filter((p) => (p.userId && friendSet.has(p.userId)) || p.userId === currentUserId);
    return spotPins;
  }, [spotPins, spotScope, currentUserId, friendSet]);

  const currentStaticPins =
    layer === "food" ? visibleFoodPins : layer === "gems" ? gemPins : layer === "spots" ? visibleSpotPins : [];

  const q = searchQuery.toLowerCase().trim();

  const filteredPins = React.useMemo(() => {
    if (!q) return currentStaticPins;
    return currentStaticPins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.area?.toLowerCase().includes(q) ||
        p.tag?.toLowerCase().includes(q),
    );
  }, [currentStaticPins, q]);

  const filteredDeals = React.useMemo(() => {
    if (!q) return visibleDeals;
    return visibleDeals.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q),
    );
  }, [visibleDeals, q]);

  const totalPins = layer === "deals" ? filteredDeals.length : filteredPins.length;

  const onSelectDeal = React.useCallback((p: Promotion) => {
    setSelected(p);
    setSelectedPin(null);
  }, []);

  const onSelectPin = React.useCallback((p: StaticPin) => {
    setSelectedPin(p);
    setSelected(null);
  }, []);

  function switchLayer(l: MapLayer) {
    setLayer(l);
    setSearchQuery("");
    setSelected(null);
    setSelectedPin(null);
  }

  function switchCountry(c: "all" | "SG" | "MY") {
    setCountryFilter(c);
    setSelected(null);
    setSelectedPin(null);
    if (c === "MY") {
      setFlyTarget({ lat: 1.4927, lng: 103.7414, zoom: 13, nonce: Date.now() });
    } else if (c === "SG") {
      setFlyTarget({ lat: 1.3521, lng: 103.8198, zoom: 12, nonce: Date.now() });
    }
  }

  function toggleCategory(cat: PromoCategory) {
    setActiveCategories((prev) => {
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
      : selectedPin && userPos
      ? haversineKm(userPos, { lat: selectedPin.lat, lng: selectedPin.lng })
      : null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom)/2)] top-14 z-30 overflow-hidden md:static md:bottom-auto md:z-auto md:h-[calc(100dvh-9rem)] md:rounded-2xl md:border">
      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          promotions={layer === "deals" ? filteredDeals : []}
          staticPins={layer !== "deals" ? filteredPins : undefined}
          onSelect={onSelectDeal}
          onSelectPin={onSelectPin}
          flyTarget={flyTarget}
          userPos={userPos}
        />
      </div>

      {/* Floating top overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-3">
        {/* Layer tabs */}
        <div className="pointer-events-auto flex w-full gap-1 rounded-2xl border border-white/40 bg-white/70 p-1.5 shadow-lg backdrop-blur-xl">
          {LAYER_TABS.map((t) => {
            const count =
              t.value === "deals"
                ? promotions.length
                : t.value === "food"
                ? foodPins.length
                : t.value === "gems"
                ? gemPins.length
                : spotPins.length;
            const active = layer === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => switchLayer(t.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-xs font-semibold transition-all sm:px-2.5",
                  active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                <span aria-hidden>{t.emoji}</span>
                <span className="hidden min-[360px]:inline">{t.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 text-[10px] font-bold leading-4",
                      active ? "bg-white/25 text-white" : "bg-zinc-900/10 text-zinc-700",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/40 bg-white/70 px-3 py-2 shadow backdrop-blur-xl">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venues, cuisine, area…"
            className="min-w-0 flex-1 bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Country filter chips (food layer only) */}
        {layer === "food" && (
          <div className="pointer-events-auto flex w-full gap-1.5 rounded-xl border border-white/40 bg-white/70 p-1.5 shadow backdrop-blur-xl">
            {(["all", "SG", "MY"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => switchCountry(c)}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                  countryFilter === c
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {c === "all" ? "🌏 All" : c === "SG" ? "🇸🇬 Singapore" : "🇲🇾 JB"}
              </button>
            ))}
          </div>
        )}

        {/* Spots scope chips (spots layer only, signed-in) */}
        {layer === "spots" && currentUserId && (
          <div className="pointer-events-auto flex w-full gap-1.5 rounded-xl border border-white/40 bg-white/70 p-1.5 shadow backdrop-blur-xl">
            {(["all", "friends", "mine"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSpotScope(s);
                  setSelectedPin(null);
                }}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                  spotScope === s
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {s === "all" ? "🌏 All" : s === "friends" ? "👥 Friends" : "📍 Mine"}
              </button>
            ))}
          </div>
        )}

        {/* Category chips (deals only) */}
        {layer === "deals" && (
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto rounded-xl border border-white/40 bg-white/70 p-2 shadow backdrop-blur-xl">
            {CATEGORIES.map((meta) => {
              const on = activeCategories.has(meta.value);
              return (
                <button
                  key={meta.value}
                  type="button"
                  onClick={() => toggleCategory(meta.value)}
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
        )}

        {/* Food layer hint */}
        {layer === "food" && (
          <div className="pointer-events-auto rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow backdrop-blur-xl">
            🍜 {visibleFoodPins.length} curated {countryFilter === "MY" ? "JB" : countryFilter === "SG" ? "SG" : "SG + JB"} food spots · tap a pin to explore
          </div>
        )}

        {/* Gems layer hint */}
        {layer === "gems" && (
          <div className="pointer-events-auto rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow backdrop-blur-xl">
            💎 {gemPins.length} hidden gems ·{" "}
            <Link href="/gems" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              view list
            </Link>
          </div>
        )}

        {/* Spots layer hint */}
        {layer === "spots" && (
          <div className="pointer-events-auto rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow backdrop-blur-xl">
            📍 {visibleSpotPins.length} {spotScope === "all" ? "community" : spotScope === "friends" ? "friends'" : "your"} check-ins ·{" "}
            <Link href="/spots" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              view feed
            </Link>
          </div>
        )}

        {/* Hot zones (deals only) */}
        {layer === "deals" && hotZones.length > 0 && (
          <div className="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 rounded-full bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              🔥 Hot zones
            </span>
            {hotZones.map((z) => (
              <button
                key={z.name}
                type="button"
                onClick={() => setFlyTarget({ lat: z.lat, lng: z.lng, zoom: 14, nonce: Date.now() })}
                className="shrink-0 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur"
              >
                {z.name} · {z.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locate-me */}
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
        {totalPins} {layer === "deals" ? "deal" : layer === "gems" ? "gem" : "spot"}{totalPins === 1 ? "" : "s"}
      </div>

      {/* Deal bottom card */}
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
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.imageUrl ?? getCategoryMeta(selected.category).fallbackImage}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {!selected.imageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-2xl">
                    {getCategoryMeta(selected.category).emoji}
                  </div>
                )}
              </div>
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

      {/* Static pin bottom card */}
      {selectedPin && (
        <div className="absolute inset-x-3 bottom-4 z-[1001] animate-fade-in-up">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setSelectedPin(null)}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/10 text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex gap-3 p-3">
              <div className={cn(
                "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-3xl",
                selectedPin.bg,
              )}>
                {selectedPin.emoji}
              </div>
              <div className="min-w-0 flex-1 space-y-1 pr-8">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    {selectedPin.tag}
                  </span>
                  {selectedPin.layer === "spot" && selectedPin.rating != null && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {selectedPin.rating}/5
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{selectedPin.name}</p>
                <p className="text-xs text-zinc-500">
                  {selectedPin.area}
                  {selectedDistance != null &&
                    ` · ${selectedDistance < 1 ? `${Math.round(selectedDistance * 1000)} m` : `${selectedDistance.toFixed(1)} km`} away`}
                </p>
                {selectedPin.layer === "spot" ? (
                  selectedPin.note && (
                    <p className="line-clamp-2 text-xs text-zinc-600">{selectedPin.note}</p>
                  )
                ) : (
                  <p className="line-clamp-1 text-xs text-zinc-400">{selectedPin.description}</p>
                )}
                {selectedPin.layer === "spot" && selectedPin.authorName && (
                  <Link
                    href={`/u/${selectedPin.userId}`}
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-800"
                  >
                    <Avatar
                      src={selectedPin.avatarUrl}
                      name={selectedPin.authorName}
                      size="sm"
                      className="h-4 w-4 text-[8px]"
                    />
                    <span className="line-clamp-1">{selectedPin.authorName}</span>
                    {selectedPin.createdAt && (
                      <span className="text-zinc-400">
                        · {formatDistanceToNow(new Date(selectedPin.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-stretch border-t border-zinc-100 text-xs font-semibold text-zinc-700">
              {selectedPin.layer === "spot" && selectedPin.userId === currentUserId && (
                <Link
                  href={`/check-in/${selectedPin.id.replace(/^spot-/, "")}/edit`}
                  className="flex flex-1 items-center justify-center gap-1.5 border-r border-zinc-100 px-4 py-2.5 hover:bg-zinc-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              )}
              <a
                href={selectedPin.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 hover:bg-zinc-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

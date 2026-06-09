"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, MapPin } from "lucide-react";
import { HIDDEN_GEMS, GEM_CATEGORY_META, type GemCategory } from "@/lib/gems/gems";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.entries(GEM_CATEGORY_META) as [GemCategory, typeof GEM_CATEGORY_META[GemCategory]][];

export function GemsClient({ initialCategory = null }: { initialCategory?: GemCategory | null }) {
  const [filter, setFilter] = React.useState<GemCategory | null>(initialCategory);

  const filtered = React.useMemo(
    () => (filter ? HIDDEN_GEMS.filter((g) => g.category === filter) : HIDDEN_GEMS),
    [filter],
  );

  return (
    <div className="space-y-8 pb-4">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 left-24 h-32 w-32 rounded-full bg-emerald-400/8 blur-2xl" />
          <div className="relative space-y-2">
            <div className="text-3xl">💎</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hidden Gems in Singapore
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Underrated spots most tourists miss — secret nature trails, heritage enclaves, street art and neighbourhood treasures.
            </p>
            <Link
              href="/map?layer=gems"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-80"
            >
              <MapPin className="h-3.5 w-3.5" /> View on map
            </Link>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === null
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30",
            )}
          >
            All ({HIDDEN_GEMS.length})
          </button>
          {CATEGORIES.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(filter === key ? null : key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? cn(meta.bg, "border-transparent")
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {filtered.length} gem{filtered.length === 1 ? "" : "s"}
          {filter && ` · ${GEM_CATEGORY_META[filter].label}`}
        </p>
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((gem) => {
          const meta = GEM_CATEGORY_META[gem.category];
          return (
            <div
              key={gem.id}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Color header */}
              <div className={cn("flex h-20 shrink-0 items-center justify-center text-4xl", meta.bg)}>
                {meta.emoji}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Badge + free tag */}
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.bg)}>
                    {meta.label}
                  </span>
                  {gem.free && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Free
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="line-clamp-2 text-sm font-bold leading-tight">{gem.name}</h3>

                {/* Area */}
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" /> {gem.area}
                </p>

                {/* Description */}
                <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">
                  {gem.description}
                </p>

                {/* Tip */}
                {gem.tip && (
                  <p className="line-clamp-2 rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                    💡 {gem.tip}
                  </p>
                )}

                {/* CTA */}
                <a
                  href={gem.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Get Directions
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

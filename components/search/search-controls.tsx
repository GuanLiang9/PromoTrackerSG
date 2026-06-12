"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/constants";
import { serializeFilters } from "@/lib/promotions/search-params";
import { cn } from "@/lib/utils";
import type { PromoCategory, PromotionFilters, PromotionSort } from "@/lib/types";

const SORT_OPTIONS: { value: PromotionSort; label: string; emoji: string }[] = [
  { value: "today", label: "Today", emoji: "📅" },
  { value: "newest", label: "New", emoji: "✨" },
  { value: "ending", label: "Ending soon", emoji: "⏳" },
  { value: "trending", label: "Trending", emoji: "🔥" },
];

const LOCATION_CHIPS = [
  "Orchard", "Marina Bay", "Jurong", "Tampines",
  "Bugis", "Sentosa", "Clementi", "Changi",
];

export function SearchControls({
  initial,
}: {
  initial: PromotionFilters;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initial.query ?? "");
  const [categories, setCategories] = React.useState<PromoCategory[]>(
    initial.categories ?? [],
  );
  const [from, setFrom] = React.useState(initial.from ?? "");
  const [to, setTo] = React.useState(initial.to ?? "");
  const [location, setLocation] = React.useState(initial.location ?? "");
  const [sort, setSort] = React.useState<PromotionSort | undefined>(initial.sort);

  function apply(next?: Partial<PromotionFilters>) {
    const filters: PromotionFilters = {
      query: query || undefined,
      categories: categories.length ? categories : undefined,
      from: from || undefined,
      to: to || undefined,
      location: location || undefined,
      sort,
      ...next,
    };
    const qs = serializeFilters(filters);
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function selectSort(value: PromotionSort) {
    const nextSort = sort === value ? undefined : value;
    setSort(nextSort);
    apply({ sort: nextSort });
  }

  function toggleCategory(cat: PromoCategory) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  const activeFilterCount =
    categories.length + (from ? 1 : 0) + (to ? 1 : 0) + (location ? 1 : 0);

  return (
    <div className="space-y-3">
    <div className="flex items-center gap-2">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search deals, brands, keywords…"
          className="pl-9"
          aria-label="Search promotions"
        />
      </form>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((meta) => {
                  const active = categories.includes(meta.value);
                  return (
                    <button
                      key={meta.value}
                      type="button"
                      onClick={() => toggleCategory(meta.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? meta.badgeClass
                          : "bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Orchard, Jurong"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {LOCATION_CHIPS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(location === loc ? "" : loc)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      location === loc
                        ? "border-brand bg-brand/10 text-brand"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    📍 {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setCategories([]);
                  setFrom("");
                  setTo("");
                  setLocation("");
                  setSort(undefined);
                }}
              >
                <X className="h-4 w-4" /> Clear
              </Button>
              <SheetClose asChild>
                <Button className="flex-1" onClick={() => apply()}>
                  Apply filters
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => selectSort(s.value)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
              sort === s.value
                ? "border-brand bg-brand text-white shadow-sm"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

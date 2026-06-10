"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Zap } from "lucide-react";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { SavedButton } from "@/components/promotions/saved-button";
import { formatDateRange, endingInLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Promotion } from "@/lib/types";
import type { PromoCategory } from "@/lib/types";

/** Vibrant gradient + emoji backdrop when no image is available. */
const CATEGORY_GRADIENT: Record<PromoCategory, string> = {
  food_beverage: "from-orange-400 via-amber-400 to-yellow-400",
  shopping:      "from-pink-400 via-rose-400 to-fuchsia-500",
  attractions:   "from-emerald-400 via-green-400 to-teal-500",
  events:        "from-violet-400 via-purple-400 to-indigo-500",
  travel:        "from-sky-400 via-blue-400 to-cyan-500",
  credit_card:   "from-indigo-400 via-blue-500 to-violet-500",
  entertainment: "from-rose-400 via-pink-400 to-red-400",
  lifestyle:     "from-teal-400 via-cyan-400 to-sky-400",
};

/** Left-border accent color per category. */
const CATEGORY_ACCENT: Record<PromoCategory, string> = {
  food_beverage: "border-l-orange-400",
  shopping:      "border-l-pink-400",
  attractions:   "border-l-emerald-400",
  events:        "border-l-violet-400",
  travel:        "border-l-sky-400",
  credit_card:   "border-l-indigo-400",
  entertainment: "border-l-rose-400",
  lifestyle:     "border-l-teal-400",
};

const CATEGORY_EMOJI: Record<PromoCategory, string> = {
  food_beverage: "🍜", shopping: "🛍️", attractions: "🎡",
  events: "🎪", travel: "✈️", credit_card: "💳",
  entertainment: "🎬", lifestyle: "🌿",
};

export function PromoCard({
  promotion,
  compact = false,
}: {
  promotion: Promotion;
  compact?: boolean;
}) {
  const ending = endingInLabel(promotion.endDate);
  const daysLeft = differenceInCalendarDays(parseISO(promotion.endDate), new Date());
  const isCritical = daysLeft >= 0 && daysLeft <= 2;
  const isNew = differenceInCalendarDays(new Date(), parseISO(promotion.createdAt)) <= 3;
  const cat = promotion.category;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card",
        "border-l-4 shadow-sm transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/8",
        CATEGORY_ACCENT[cat],
      )}
    >
      <Link href={`/promotions/${promotion.id}`} className="flex flex-1 flex-col">
        {!compact && (
          <div className="relative h-36 shrink-0 overflow-hidden">
            {promotion.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={promotion.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                {/* Category badge overlaid on image */}
                <div className="absolute bottom-2 left-3">
                  <CategoryBadge category={cat} />
                </div>
              </>
            ) : (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center bg-gradient-to-br",
                  CATEGORY_GRADIENT[cat],
                )}
              >
                <span className="select-none text-6xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {CATEGORY_EMOJI[cat]}
                </span>
              </div>
            )}

            {/* Badges on image */}
            <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
              {isNew && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  NEW
                </span>
              )}
              {promotion.discountPct != null && (
                <span className="flex items-center gap-0.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  <Zap className="h-2.5 w-2.5" />
                  {promotion.discountPct}% OFF
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-4">
          {/* Top row: badge + score + ending-soon */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Show badge only when no image (already overlaid above when image exists) */}
              {(compact || !promotion.imageUrl) && <CategoryBadge category={cat} />}
              <ScoreChip score={promotion.baseScore} />
            </div>
            {ending && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isCritical
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                )}
              >
                {isCritical && (
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
                )}
                {ending}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {promotion.title}
          </h3>

          {!compact && (
            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {promotion.description || " "}
            </p>
          )}

          {/* Footer */}
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatDateRange(promotion.startDate, promotion.endDate)}
            </span>
            {promotion.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{promotion.location}</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 z-10">
        <SavedButton
          promotionId={promotion.id}
          initialSaved={promotion.isSaved ?? false}
        />
      </div>
    </div>
  );
}

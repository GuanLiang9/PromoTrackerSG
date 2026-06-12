"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { SavedButton } from "@/components/promotions/saved-button";
import { formatDateRange, endingInLabel } from "@/lib/format";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Promotion } from "@/lib/types";

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
  const meta = getCategoryMeta(promotion.category);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <Link href={`/promotions/${promotion.id}`} className="flex flex-1 flex-col">
        {!compact && (
          <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
            {/* Emoji/tint placeholder sits underneath; the image covers it when
                it loads and is hidden (revealing the placeholder) on error. */}
            <div className={cn("absolute inset-0 flex items-center justify-center", meta.chipClass)}>
              <span className="select-none text-5xl opacity-60 transition-transform duration-300 group-hover:scale-110">
                {meta.emoji}
              </span>
            </div>
            {promotion.imageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={promotion.imageUrl}
                  alt=""
                  className="relative h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              </>
            )}

            {/* Category chip — bottom-left, glassy on image */}
            <div className="absolute bottom-2.5 left-2.5">
              {promotion.imageUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm backdrop-blur">
                  {meta.emoji} {meta.short}
                </span>
              ) : (
                <CategoryBadge category={promotion.category} />
              )}
            </div>

            {/* Status badges — top-left */}
            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              {isNew && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-foreground shadow-sm">
                  New
                </span>
              )}
              {promotion.discountPct != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  <Tag className="h-2.5 w-2.5" />
                  {promotion.discountPct}% OFF
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {compact && <CategoryBadge category={promotion.category} />}
              <ScoreChip score={promotion.baseScore} />
            </div>
            {ending && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                  isCritical
                    ? "bg-destructive/12 text-destructive"
                    : "bg-amber-500/12 text-amber-600 dark:text-amber-400",
                )}
              >
                {isCritical && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />}
                {ending}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-card-foreground">
            {promotion.title}
          </h3>

          {!compact && promotion.description && (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {promotion.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {formatDateRange(promotion.startDate, promotion.endDate)}
            </span>
            {promotion.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="line-clamp-1">{promotion.location}</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5 z-10">
        <SavedButton
          promotionId={promotion.id}
          initialSaved={promotion.isSaved ?? false}
        />
      </div>
    </div>
  );
}

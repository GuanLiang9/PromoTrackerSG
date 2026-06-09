import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { SavedButton } from "@/components/promotions/saved-button";
import { formatDateRange, endingInLabel } from "@/lib/format";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

export function PromoCard({
  promotion,
  compact = false,
}: {
  promotion: Promotion;
  compact?: boolean;
}) {
  const ending = endingInLabel(promotion.endDate);
  const meta = getCategoryMeta(promotion.category);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/promotions/${promotion.id}`} className="flex flex-1 flex-col">
        {!compact && (
          <div className="relative h-36 shrink-0 overflow-hidden">
            {promotion.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={promotion.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </>
            ) : (
              <div className={cn("flex h-full w-full items-center justify-center", meta.chipClass)}>
                <span className="select-none text-5xl opacity-50">{meta.emoji}</span>
              </div>
            )}
          </div>
        )}
        {/* Content — flex-1 so it fills remaining height, keeping footer pinned bottom */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={promotion.category} />
              <ScoreChip score={promotion.baseScore} />
            </div>
            {ending && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-destructive" />
                {ending}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {promotion.title}
          </h3>
          {!compact && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {promotion.description || " "}
            </p>
          )}
          {/* Footer — pushed to the bottom */}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatDateRange(promotion.startDate, promotion.endDate)}
            </span>
            {promotion.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{promotion.location}</span>
              </span>
            )}
            {!compact && promotion.sourceName && (
              <span className="line-clamp-1 text-muted-foreground/60">{promotion.sourceName}</span>
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
    </Card>
  );
}

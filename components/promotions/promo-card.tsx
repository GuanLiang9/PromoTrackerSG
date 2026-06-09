import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScoreChip } from "@/components/promotions/score-badge";
import { SavedButton } from "@/components/promotions/saved-button";
import { formatDateRange, endingInLabel } from "@/lib/format";
import type { Promotion } from "@/lib/types";

export function PromoCard({
  promotion,
  compact = false,
}: {
  promotion: Promotion;
  compact?: boolean;
}) {
  const ending = endingInLabel(promotion.endDate);

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/promotions/${promotion.id}`} className="block">
        {!compact && promotion.imageUrl && (
          <div className="relative h-36 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={promotion.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* gradient scrim over image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={promotion.category} />
              <ScoreChip score={promotion.baseScore} />
            </div>
            {ending && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-destructive" />
                {ending}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {promotion.title}
          </h3>
          {!compact && promotion.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {promotion.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateRange(promotion.startDate, promotion.endDate)}
            </span>
            {promotion.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {promotion.location}
              </span>
            )}
          </div>
          {!compact && promotion.sourceName && (
            <p className="text-xs text-muted-foreground/60">{promotion.sourceName}</p>
          )}
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <SavedButton
          promotionId={promotion.id}
          initialSaved={promotion.isSaved ?? false}
        />
      </div>
    </Card>
  );
}

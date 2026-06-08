import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/promotions/category-badge";
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
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/promotions/${promotion.id}`} className="block">
        {!compact && promotion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={promotion.imageUrl}
            alt=""
            className="h-36 w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <CategoryBadge category={promotion.category} />
            {ending && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
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

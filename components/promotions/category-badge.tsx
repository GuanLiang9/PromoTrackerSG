import { Badge } from "@/components/ui/badge";
import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PromoCategory } from "@/lib/types";

export function CategoryBadge({
  category,
  className,
}: {
  category: PromoCategory;
  className?: string;
}) {
  const meta = getCategoryMeta(category);
  return (
    <Badge className={cn("gap-1", meta.badgeClass, className)}>
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}

export function CategoryDot({ category }: { category: PromoCategory }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", meta.dotClass)}
      aria-hidden
    />
  );
}

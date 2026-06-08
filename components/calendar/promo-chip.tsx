import { getCategoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/types";

/** Compact, category-colored pill shown inside a calendar day cell. */
export function PromoChip({
  promotion,
  className,
}: {
  promotion: Promotion;
  className?: string;
}) {
  const meta = getCategoryMeta(promotion.category);
  return (
    <span
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight sm:text-[11px]",
        meta.chipClass,
        className,
      )}
      title={promotion.title}
    >
      {promotion.title}
    </span>
  );
}

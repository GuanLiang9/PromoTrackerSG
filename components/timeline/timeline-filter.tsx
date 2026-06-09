"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PromoCategory } from "@/lib/types";

export function TimelineFilter({ active }: { active: PromoCategory[] }) {
  const router = useRouter();
  const set = new Set(active);

  function toggle(cat: PromoCategory) {
    const next = new Set(set);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    const q = next.size ? `?category=${[...next].join(",")}` : "";
    router.push(`/timeline${q}`);
  }

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {CATEGORIES.map((meta) => {
        const on = set.has(meta.value);
        return (
          <button
            key={meta.value}
            type="button"
            onClick={() => toggle(meta.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              on ? meta.badgeClass : "bg-background text-muted-foreground",
            )}
          >
            {meta.emoji} {meta.short}
          </button>
        );
      })}
    </div>
  );
}

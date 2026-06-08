import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1.5", className)}>
      {CATEGORIES.map((meta) => (
        <span
          key={meta.value}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", meta.dotClass)} />
          {meta.label}
        </span>
      ))}
    </div>
  );
}

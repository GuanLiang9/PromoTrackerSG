import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-none sm:h-24" />
        ))}
      </div>
    </div>
  );
}

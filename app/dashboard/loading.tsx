export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-4">
      {/* Hero skeleton */}
      <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      {/* Section skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-48 w-64 shrink-0 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GemsLoading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

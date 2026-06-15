import Link from "next/link";
import { ExternalLink, MapPin, Star } from "lucide-react";
import { CUISINE_META } from "@/lib/food/spots";
import { bucketCheckIns } from "@/lib/timeline/checkin-buckets";
import { cn } from "@/lib/utils";
import type { CheckIn } from "@/lib/checkins/types";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  });
}

export function CheckInTimeline({
  checkIns,
  emptyLabel = "No check-ins yet.",
}: {
  checkIns: CheckIn[];
  emptyLabel?: string;
}) {
  const buckets = bucketCheckIns(checkIns);

  if (buckets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {buckets.map((b) => (
        <section key={b.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{b.label}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {b.checkIns.length}
            </span>
          </div>

          <ol className="relative space-y-3 border-l border-border/70 pl-5">
            {b.checkIns.map((c) => (
              <TimelineEntry key={c.id} checkIn={c} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineEntry({ checkIn: c }: { checkIn: CheckIn }) {
  const meta = c.cuisine ? CUISINE_META[c.cuisine] : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`;

  return (
    <li className="relative animate-fade-in-up">
      {/* Rail node */}
      <span
        className={cn(
          "absolute -left-[1.65rem] flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-sm shadow-sm",
          meta?.bg ?? "bg-muted",
        )}
      >
        {meta?.emoji ?? "🍴"}
      </span>

      <div className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold leading-snug">{c.venueName}</h4>
          <span className="shrink-0 text-[11px] text-muted-foreground">{timeOf(c.createdAt)}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {meta && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", meta.bg)}>
              {meta.emoji} {meta.label}
            </span>
          )}
          {c.rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {c.rating}/5
            </span>
          )}
          {c.area && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {c.area}
            </span>
          )}
        </div>

        {c.note && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
        )}

        <Link
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Open in Maps
        </Link>
      </div>
    </li>
  );
}

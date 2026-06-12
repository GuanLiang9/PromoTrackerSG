"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, Crosshair, Loader2, MapPin, Star } from "lucide-react";
import { CUISINE_META, type CuisineType } from "@/lib/food/spots";
import { createCheckIn } from "@/lib/checkins/actions";
import { cn } from "@/lib/utils";

const SG_CENTER = { lat: 1.3521, lng: 103.8198 };
const CUISINES = Object.entries(CUISINE_META) as [CuisineType, (typeof CUISINE_META)[CuisineType]][];

const PickLocationMap = dynamic(() => import("@/components/checkins/pick-location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function CheckInForm({ defaultAuthorName }: { defaultAuthorName: string }) {
  const router = useRouter();
  const [pos, setPos] = React.useState(SG_CENTER);
  const [located, setLocated] = React.useState(false);
  const [venueName, setVenueName] = React.useState("");
  const [authorName, setAuthorName] = React.useState(defaultAuthorName);
  const [cuisine, setCuisine] = React.useState<CuisineType | null>(null);
  const [area, setArea] = React.useState("");
  const [rating, setRating] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const locate = React.useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated(true);
      },
      () => setLocated(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Auto-detect once on mount.
  React.useEffect(() => {
    locate();
  }, [locate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!venueName.trim()) {
      setError("Enter the venue name.");
      return;
    }
    setSubmitting(true);
    const res = await createCheckIn({
      venueName,
      authorName,
      note,
      rating,
      cuisine,
      area,
      latitude: pos.lat,
      longitude: pos.lng,
    });
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    router.push("/spots");
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-4">
      <Link
        href="/spots"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="relative space-y-2">
          <div className="text-3xl">📍</div>
          <h1 className="text-2xl font-bold tracking-tight">Check in a spot</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Found somewhere worth sharing? Drop a pin, rate it, and post it to the community map.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Location picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Location
            </p>
            <button
              type="button"
              onClick={locate}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <Crosshair className="h-3.5 w-3.5" /> Use my location
            </button>
          </div>
          <div className="relative h-56 overflow-hidden rounded-2xl border">
            <PickLocationMap lat={pos.lat} lng={pos.lng} onChange={(lat, lng) => setPos({ lat, lng })} />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {located ? "Drag the pin to fine-tune. " : "Detecting your location… "}
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </p>
        </div>

        {/* Venue name */}
        <Field label="Venue name" required>
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="e.g. Toast Box @ Tampines"
            maxLength={120}
            className={inputCls}
          />
        </Field>

        {/* Rating */}
        <div className="space-y-1.5">
          <FieldLabel>Rating</FieldLabel>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    rating != null && n <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
            {rating != null && (
              <button
                type="button"
                onClick={() => setRating(null)}
                className="ml-2 text-xs text-muted-foreground hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cuisine */}
        <div className="space-y-1.5">
          <FieldLabel>Cuisine</FieldLabel>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {CUISINES.map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCuisine(cuisine === key ? null : key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  cuisine === key
                    ? cn(meta.bg, "border-transparent")
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                )}
              >
                {meta.emoji} {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <Field label="Area">
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Tampines, East"
            maxLength={80}
            className={inputCls}
          />
        </Field>

        {/* Note */}
        <Field label="Note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What makes it nice? What should people order?"
            maxLength={500}
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        {/* Posting as */}
        <Field label="Posting as">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your display name"
            maxLength={40}
            className={inputCls}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Posting…" : "Post check-in"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-ring";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </FieldLabel>
      {children}
    </div>
  );
}

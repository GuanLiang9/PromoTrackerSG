"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, MapPin, Star, Trash2, User } from "lucide-react";
import { CUISINE_META } from "@/lib/food/spots";
import { deleteCheckIn } from "@/lib/checkins/actions";
import { cn } from "@/lib/utils";
import type { CheckIn } from "@/lib/checkins/types";

export function CheckInCard({
  checkIn,
  isOwner,
}: {
  checkIn: CheckIn;
  isOwner: boolean;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [removed, setRemoved] = React.useState(false);
  const meta = checkIn.cuisine ? CUISINE_META[checkIn.cuisine] : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${checkIn.latitude},${checkIn.longitude}`;

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteCheckIn(checkIn.id);
    if (res.ok) setRemoved(true);
    else setDeleting(false);
  }

  if (removed) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-md">
      {/* Header band — cuisine colour or neutral */}
      <div className={cn("flex h-20 shrink-0 items-center justify-center", meta?.bg ?? "bg-muted")}>
        <span className="text-4xl">{meta?.emoji ?? "🍴"}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{checkIn.venueName}</h3>
          {isOwner && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete check-in"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Badges: cuisine + rating */}
        <div className="flex flex-wrap items-center gap-1.5">
          {meta && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", meta.bg)}>
              {meta.emoji} {meta.label}
            </span>
          )}
          {checkIn.rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {checkIn.rating}/5
            </span>
          )}
        </div>

        {checkIn.area && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{checkIn.area}</span>
          </p>
        )}

        {checkIn.note && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{checkIn.note}</p>
        )}

        {/* Footer: author + time */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="line-clamp-1">{checkIn.authorName}</span>
          </span>
          <span className="shrink-0">
            {formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true })}
          </span>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
        </a>
      </div>
    </div>
  );
}

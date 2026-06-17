"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Map as MapIcon, MapPin, Pencil, Star, Trash2 } from "lucide-react";
import { CUISINE_META } from "@/lib/food/spots";
import { deleteCheckIn } from "@/lib/checkins/actions";
import { Avatar } from "@/components/profile/avatar";
import { cn } from "@/lib/utils";
import type { CheckIn } from "@/lib/checkins/types";

export function CheckInCard({
  checkIn,
  isOwner,
  author,
}: {
  checkIn: CheckIn;
  isOwner: boolean;
  /** Live author profile (avatar + name) for the footer. */
  author?: { avatarUrl: string | null; displayName: string | null };
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [removed, setRemoved] = React.useState(false);
  const meta = checkIn.cuisine ? CUISINE_META[checkIn.cuisine] : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${checkIn.latitude},${checkIn.longitude}`;
  const spotHref = `/map?spot=${checkIn.id}`;
  const authorName = author?.displayName || checkIn.authorName;

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
      {/* Header band — tap to open this spot on the in-app map */}
      <Link
        href={spotHref}
        className={cn(
          "flex h-20 shrink-0 items-center justify-center transition-opacity hover:opacity-90",
          meta?.bg ?? "bg-muted",
        )}
        aria-label={`View ${checkIn.venueName} on the map`}
      >
        <span className="text-4xl">{meta?.emoji ?? "🍴"}</span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={spotHref} className="min-w-0 transition-colors hover:text-brand">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{checkIn.venueName}</h3>
          </Link>
          {isOwner && (
            <div className="flex shrink-0 items-center">
              <Link
                href={`/check-in/${checkIn.id}/edit`}
                aria-label="Edit check-in"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label="Delete check-in"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
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
          <Link
            href={`/u/${checkIn.userId}`}
            className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Avatar src={author?.avatarUrl} name={authorName} size="sm" className="h-5 w-5 text-[9px]" />
            <span className="line-clamp-1">{authorName}</span>
          </Link>
          <span className="shrink-0">
            {formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={spotHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
          >
            <MapIcon className="h-3.5 w-3.5" /> View on map
          </Link>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in Google Maps"
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

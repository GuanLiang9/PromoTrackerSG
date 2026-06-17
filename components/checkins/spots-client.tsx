"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CheckInCard } from "@/components/checkins/check-in-card";
import { cn } from "@/lib/utils";
import type { CheckIn } from "@/lib/checkins/types";
import type { AuthorInfo } from "@/lib/profiles/queries";

type Filter = "all" | "friends" | "mine";

export function SpotsClient({
  checkIns,
  currentUserId,
  friendIds = [],
  authors = {},
}: {
  checkIns: CheckIn[];
  currentUserId: string | null;
  friendIds?: string[];
  authors?: Record<string, AuthorInfo>;
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const friendSet = React.useMemo(() => new Set(friendIds), [friendIds]);

  const visible = React.useMemo(() => {
    if (filter === "mine") return checkIns.filter((c) => c.userId === currentUserId);
    if (filter === "friends")
      return checkIns.filter((c) => friendSet.has(c.userId) || c.userId === currentUserId);
    return checkIns;
  }, [filter, checkIns, currentUserId, friendSet]);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-24 h-32 w-32 rounded-full bg-emerald-400/8 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-3xl">📍</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Community Spots</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Restaurants and cafés checked in by the community — and your own food history.
            </p>
          </div>
          <Link
            href="/check-in"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Check in
          </Link>
        </div>
      </div>

      {/* Filter toggle */}
      {currentUserId && (
        <div className="flex gap-2">
          {(["all", "friends", "mine"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              {f === "all" ? "All check-ins" : f === "friends" ? "Friends" : "My check-ins"}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {filter === "mine"
            ? "You haven't checked in anywhere yet — tap Check in to start your food history."
            : filter === "friends"
              ? "No check-ins from your friends yet — add friends from their profile to see their spots here."
              : "No check-ins yet. Be the first to share a spot!"}
        </div>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CheckInCard
              key={c.id}
              checkIn={c}
              isOwner={c.userId === currentUserId}
              author={authors[c.userId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

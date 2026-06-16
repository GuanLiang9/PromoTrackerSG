"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { computeStats } from "@/lib/rewards/compute";

/**
 * Top-bar trophy → /rewards, mobile only (desktop uses NavLinks). When signed in
 * it shows the live current-streak as a small flame badge so the daily loop is
 * always glanceable. Mirrors the client-side auth pattern in account-menu.tsx.
 */
export function RewardsButton() {
  const [streak, setStreak] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();

    async function loadFor(userId: string | null) {
      if (!userId) {
        setStreak(null);
        return;
      }
      const { data } = await supabase
        .from("check_ins")
        .select("created_at, venue_name, area, cuisine, rating")
        .eq("user_id", userId);
      setStreak(computeStats(data ?? []).currentStreak);
    }

    // Initial read happens OUTSIDE the auth callback. Any Supabase call inside
    // onAuthStateChange — even a data query (it needs the access token, which
    // awaits initialize()) — deadlocks the client's initialize(). So read the
    // session from the event arg and defer the actual work with setTimeout(0),
    // letting initialize() finish first.
    supabase.auth.getUser().then(({ data }) => loadFor(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const userId = session?.user?.id ?? null;
      setTimeout(() => loadFor(userId), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Link
      href="/rewards"
      aria-label="Rewards"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
    >
      <Trophy className="h-5 w-5" />
      {streak != null && streak > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-4 text-white">
          {streak}
        </span>
      )}
    </Link>
  );
}

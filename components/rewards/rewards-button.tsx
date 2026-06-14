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

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setStreak(null);
        return;
      }
      const { data } = await supabase
        .from("check_ins")
        .select("created_at, venue_name, area, cuisine, rating")
        .eq("user_id", auth.user.id);
      setStreak(computeStats(data ?? []).currentStreak);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
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

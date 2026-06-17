"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { computeStats } from "@/lib/rewards/compute";
import { acknowledge, countUnseen, getAcknowledged } from "@/lib/rewards/seen";

/**
 * Top-bar trophy → /rewards, mobile only (desktop uses NavLinks). The badge
 * counts NEW unseen achievements (badges / level-ups / streak milestones) and
 * clears when the user opens /rewards. Re-checks on navigation so a fresh
 * check-in surfaces the badge without a reload.
 */
export function RewardsButton() {
  const pathname = usePathname();
  const [unseen, setUnseen] = React.useState(0);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    async function loadFor(userId: string | null) {
      if (!userId) {
        if (active) setUnseen(0);
        return;
      }
      const { data } = await supabase
        .from("check_ins")
        .select("created_at, venue_name, area, cuisine, rating")
        .eq("user_id", userId);
      const stats = computeStats(data ?? []);
      const ack = getAcknowledged(userId);
      if (!ack) {
        // First time on this device — baseline silently so we don't badge the
        // whole back-catalogue; only achievements earned from now on count.
        acknowledge(userId, stats);
        if (active) setUnseen(0);
      } else if (active) {
        setUnseen(countUnseen(ack, stats));
      }
    }

    // Read OUTSIDE the auth callback (a Supabase call inside onAuthStateChange
    // deadlocks initialize()); defer the in-callback refresh with setTimeout(0).
    supabase.auth.getUser().then(({ data }) => loadFor(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const userId = session?.user?.id ?? null;
      setTimeout(() => loadFor(userId), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  return (
    <Link
      href="/rewards"
      aria-label={unseen > 0 ? `Rewards — ${unseen} new` : "Rewards"}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
    >
      <Trophy className="h-5 w-5" />
      {unseen > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 animate-scale-in items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-4 text-white">
          {unseen}
        </span>
      )}
    </Link>
  );
}

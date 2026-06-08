import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PromoGrid } from "@/components/promotions/promo-list";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getSavedPromotions } from "@/lib/promotions/queries";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Saved</h1>
        <SetupNotice />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Saved promotions</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to bookmark promotions and get reminders before they expire.
        </p>
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const saved = await getSavedPromotions();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saved promotions</h1>
        <p className="text-sm text-muted-foreground">
          Your bookmarked deals, all in one place.
        </p>
      </div>
      <PromoGrid
        promotions={saved}
        empty="You haven’t saved any promotions yet. Tap the bookmark on any deal."
      />
    </div>
  );
}

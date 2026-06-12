import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InterestsForm } from "@/components/interests/interests-form";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getUserPreferences } from "@/lib/promotions/preferences";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Your interests" };
export const dynamic = "force-dynamic";

export default async function InterestsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Your interests</h1>
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
        <h1 className="text-2xl font-bold tracking-tight">Your interests</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to pick your interests and get personalized recommendations.
        </p>
        <Button asChild>
          <Link href="/auth/login?next=/interests">Sign in / Create account</Link>
        </Button>
      </div>
    );
  }

  const prefs = await getUserPreferences();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your interests</h1>
        <p className="text-sm text-muted-foreground">
          Pick what you like — we&apos;ll tailor &quot;Recommended for you&quot;.
        </p>
      </div>
      <InterestsForm initial={prefs?.interests ?? []} />
    </div>
  );
}

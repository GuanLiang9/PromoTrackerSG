import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckInForm } from "@/components/checkins/check-in-form";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Check in" };
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/check-in");

  const defaultAuthorName = (user.email ?? "Foodie").split("@")[0];
  return <CheckInForm defaultAuthorName={defaultAuthorName} />;
}

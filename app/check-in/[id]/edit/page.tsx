import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { CheckInForm } from "@/components/checkins/check-in-form";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getCheckInById } from "@/lib/checkins/queries";

export const metadata: Metadata = { title: "Edit check-in" };
export const dynamic = "force-dynamic";

export default async function EditCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/check-in/${id}/edit`);

  const checkIn = await getCheckInById(id);
  if (!checkIn) notFound();
  // Only the owner may edit.
  if (checkIn.userId !== user.id) redirect("/spots");

  const defaultAuthorName = (user.email ?? "Foodie").split("@")[0];
  return <CheckInForm defaultAuthorName={defaultAuthorName} checkIn={checkIn} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/layout/setup-notice";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/dashboard";

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(safeNext);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl text-brand-foreground shadow-sm">
          🇸🇬
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to PromoSG</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to save promotions and get personalized deals.
        </p>
      </div>

      {isSupabaseConfigured ? (
        <Card className="p-5 sm:p-6">
          <AuthForm
            next={safeNext}
            initialMode={mode === "signup" ? "signup" : "signin"}
          />
        </Card>
      ) : (
        <SetupNotice />
      )}
    </div>
  );
}

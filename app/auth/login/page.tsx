import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { SetupNotice } from "@/components/layout/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to PromoSG</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with a magic link to save promotions.
        </p>
      </div>
      {isSupabaseConfigured ? <LoginForm /> : <SetupNotice />}
    </div>
  );
}

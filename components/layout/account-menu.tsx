"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogIn, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Re-check on every navigation: a server-action login is a soft navigation
  // that neither remounts this component nor fires onAuthStateChange on the
  // browser client, so without this the menu would stay "Sign in" until a full
  // reload. getSession() reads the cookie locally (no network, no token
  // validation needed for a UI toggle). `ready` only flips once, so navigating
  // never reflashes the loading skeleton.
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => { if (active) setEmail(data.session?.user?.email ?? null); })
      .catch(() => { if (active) setEmail(null); })
      .finally(() => { if (active) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  // Avoid a flash of the wrong state before we know the session.
  if (!ready) {
    return <div className="h-9 w-9 rounded-full bg-muted" aria-hidden />;
  }

  if (!email) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initial = email[0]?.toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground shadow-sm outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="border-b px-2 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Signed in as
          </p>
          <p className="truncate text-sm font-medium">{email}</p>
        </div>
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <User className="h-4 w-4" /> My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/interests")}>
          My interests
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/saved")}>
          Saved promotions
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handleSignOut();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

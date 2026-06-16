"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

// Singleton: every client component shares ONE GoTrueClient.
let browserClient: BrowserClient | undefined;

/** Browser-side Supabase client (used by client components). */
export function createClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}

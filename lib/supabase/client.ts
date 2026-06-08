"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Browser-side Supabase client (used by client components). */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

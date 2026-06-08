import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  getServiceRoleKey,
} from "@/lib/supabase/env";

/**
 * Server-side Supabase client bound to the request's cookies. Use in Server
 * Components, Server Actions and Route Handlers. Honours RLS for the signed-in
 * user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` called from a Server Component — safe to ignore, the
          // middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Privileged client using the service-role key. Bypasses RLS — only use in
 * trusted server contexts (cron jobs, admin actions). Never expose to the
 * browser.
 */
export function createAdminClient() {
  return createServerClient(SUPABASE_URL, getServiceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

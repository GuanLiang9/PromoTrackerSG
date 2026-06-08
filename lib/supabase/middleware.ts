import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session on every request so Server Components
 * always see a valid session. Call from `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session to trigger a refresh if needed.
  await supabase.auth.getUser();

  return response;
}

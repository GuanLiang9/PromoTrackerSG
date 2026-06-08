/**
 * Centralised access to Supabase environment configuration.
 *
 * `isSupabaseConfigured` lets the UI degrade gracefully (render an empty state
 * / setup hint) instead of crashing when the project has not been wired up yet.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin/cron operations.",
    );
  }
  return key;
}

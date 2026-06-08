import { AlertTriangle } from "lucide-react";

/** Friendly hint shown when Supabase env vars are not configured yet. */
export function SetupNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Supabase isn’t connected yet</p>
        <p className="mt-1 text-amber-800 dark:text-amber-300/90">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to your environment, then run
          the migrations and seed in <code>supabase/</code>. See the README.
        </p>
      </div>
    </div>
  );
}

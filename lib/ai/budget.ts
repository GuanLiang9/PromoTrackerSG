import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hard ceiling on OpenRouter calls per day across the whole app. Keeps usage
 * firmly inside the free tier no matter what triggers a call. The daily summary
 * needs 1; ingestion is weekly. 5 leaves headroom for manual re-runs.
 */
export const DAILY_AI_CAP = 5;

/**
 * Atomically-ish reserve `cost` AI calls for today. Returns false when the cap
 * would be exceeded — callers must then use a deterministic fallback.
 */
export async function tryConsumeAIBudget(
  supabase: SupabaseClient,
  cost = 1,
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_usage")
    .select("calls")
    .eq("usage_date", today)
    .maybeSingle();

  const current = data?.calls ?? 0;
  if (current + cost > DAILY_AI_CAP) return false;

  await supabase
    .from("ai_usage")
    .upsert({ usage_date: today, calls: current + cost }, { onConflict: "usage_date" });
  return true;
}

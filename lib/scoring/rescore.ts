import type { SupabaseClient } from "@supabase/supabase-js";
import { parseSavings } from "@/lib/scoring/parse-savings";
import { computeBaseScore } from "@/lib/scoring/score";

/**
 * Recompute discount/savings + base_score for all active promotions.
 * Deterministic and free (no AI). Safe to run daily in the cron.
 */
export async function rescoreActivePromotions(
  supabase: SupabaseClient,
): Promise<{ scored: number; error?: string }> {
  const { data, error } = await supabase
    .from("promotions")
    .select("id, title, description, tags, end_date, saved_count, discount_pct, savings_amount")
    .eq("status", "active");

  if (error) return { scored: 0, error: error.message };
  const rows = data ?? [];

  let scored = 0;
  // Update sequentially in small batches to stay within subrequest limits.
  for (const r of rows) {
    const text = [r.title, r.description, (r.tags ?? []).join(" ")]
      .filter(Boolean)
      .join(" ");
    const parsed = parseSavings(text);
    const discountPct = parsed.discountPct ?? r.discount_pct ?? null;
    const savingsAmount = parsed.savingsAmount ?? r.savings_amount ?? null;

    const { score, reasons } = computeBaseScore({
      discountPct,
      savingsAmount,
      savedCount: r.saved_count ?? 0,
      endDate: r.end_date,
      text,
    });

    const { error: upErr } = await supabase
      .from("promotions")
      .update({
        discount_pct: discountPct,
        savings_amount: savingsAmount,
        base_score: score,
        score_reasons: reasons,
      })
      .eq("id", r.id);
    if (!upErr) scored++;
  }

  return { scored };
}

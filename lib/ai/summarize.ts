import type { SupabaseClient } from "@supabase/supabase-js";
import { tryConsumeAIBudget } from "@/lib/ai/budget";

export interface DailySummaryContent {
  food?: string;
  shopping?: string;
  family?: string;
}

interface Pick {
  title: string;
  savings: number | null;
  score: number | null;
}

const GROUPS: { key: keyof DailySummaryContent; label: string; cats: string[] }[] = [
  { key: "food", label: "Food", cats: ["food_beverage"] },
  { key: "shopping", label: "Shopping", cats: ["shopping"] },
  { key: "family", label: "Family activities", cats: ["attractions", "events", "lifestyle"] },
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Build the daily "Today's best deals" summary. Tries ONE OpenRouter call/day
 * (guarded by the budget cap); always falls back to a deterministic sentence
 * template so it stays free and never fails.
 */
export async function generateDailySummary(
  supabase: SupabaseClient,
): Promise<{ content: DailySummaryContent; source: "ai" | "template" }> {
  const picks: Record<string, Pick[]> = {};
  for (const g of GROUPS) {
    const { data } = await supabase
      .from("promotions")
      .select("title, savings_amount, base_score")
      .eq("status", "active")
      .in("category", g.cats)
      .order("base_score", { ascending: false, nullsFirst: false })
      .limit(4);
    picks[g.key] = (data ?? []).map((r) => ({
      title: r.title as string,
      savings: (r.savings_amount as number | null) ?? null,
      score: (r.base_score as number | null) ?? null,
    }));
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (apiKey && (await tryConsumeAIBudget(supabase))) {
    try {
      const ai = await callOpenRouter(picks);
      if (ai) return { content: ai, source: "ai" };
    } catch {
      // fall through to template
    }
  }

  return { content: templateSummary(picks), source: "template" };
}

function templateSummary(picks: Record<string, Pick[]>): DailySummaryContent {
  const out: DailySummaryContent = {};
  for (const g of GROUPS) {
    const list = picks[g.key] ?? [];
    if (list.length === 0) continue;
    const top = list[0];
    const save = top.savings ? ` (save ~S$${Math.round(top.savings)})` : "";
    const rest = list.slice(1, 3).map((p) => p.title);
    out[g.key] =
      `Top pick: ${top.title}${save}.` +
      (rest.length ? ` Also worth a look: ${rest.join(", ")}.` : "");
  }
  return out;
}

async function callOpenRouter(
  picks: Record<string, Pick[]>,
): Promise<DailySummaryContent | null> {
  const model =
    process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";

  const lines = GROUPS.map((g) => {
    const list = (picks[g.key] ?? [])
      .map((p) => `- ${p.title}${p.savings ? ` (save S$${Math.round(p.savings)})` : ""}`)
      .join("\n");
    return `${g.label}:\n${list || "- (none)"}`;
  }).join("\n\n");

  const body = JSON.stringify({
    model,
    temperature: 0.3,
    max_tokens: 260,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write punchy one-sentence summaries of Singapore deals. Return ONLY JSON with keys food, shopping, family. Each value is a single upbeat sentence (max 25 words) highlighting the best deals from the list. If a group has no deals, omit its key.",
      },
      { role: "user", content: lines },
    ],
  });

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "PromoSG Daily Summary",
    },
    body,
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DailySummaryContent;
    return {
      food: clean(parsed.food),
      shopping: clean(parsed.shopping),
      family: clean(parsed.family),
    };
  } catch {
    return null;
  }
}

function clean(s: string | undefined): string | undefined {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : undefined;
}

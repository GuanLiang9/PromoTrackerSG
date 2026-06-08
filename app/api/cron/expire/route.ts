import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { toDateKey } from "@/lib/calendar/date";

export const dynamic = "force-dynamic";

/**
 * Daily job: archive promotions whose end_date has passed. Historical records
 * are kept (status flips active → archived), they just stop showing in the
 * frontend (which only queries status='active').
 *
 * Protected by CRON_SECRET. Configure as a Supabase scheduled function or a
 * Vercel Cron hitting this endpoint. See README → Deployment.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = toDateKey(new Date());
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("promotions")
    .update({ status: "archived" })
    .lt("end_date", today)
    .eq("status", "active")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ archived: data?.length ?? 0, ran_at: today });
}

// Allow GET for easy manual / cron-provider invocation.
export const GET = POST;

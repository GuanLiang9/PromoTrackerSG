import type { Metadata } from "next";
import { CalendarRoot } from "@/components/calendar/calendar-root";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getRangeBounds } from "@/lib/calendar/date";
import { parseFocusDate, parseView } from "@/lib/calendar/params";
import { getPromotionsInRange } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { toDateKey } from "@/lib/calendar/date";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view = parseView(typeof sp.view === "string" ? sp.view : undefined);
  const focus = parseFocusDate(
    typeof sp.date === "string" ? sp.date : undefined,
  );

  const { start, end } = getRangeBounds(view, focus);
  const promotions = await getPromotionsInRange(start, end);

  return (
    <div className="space-y-4">
      {!isSupabaseConfigured && <SetupNotice />}
      <CalendarRoot
        view={view}
        focusISO={toDateKey(focus)}
        promotions={promotions}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PromoRow } from "@/components/promotions/promo-list";
import { SetupNotice } from "@/components/layout/setup-notice";
import { Button } from "@/components/ui/button";
import { getDashboardSections } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Promotion } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Section({
  title,
  promotions,
  href,
}: {
  title: string;
  promotions: Promotion[];
  href?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <PromoRow promotions={promotions} />
    </section>
  );
}

export default async function DashboardPage() {
  const sections = await getDashboardSections();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            What’s on in Singapore today
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse every deal, event and discount on one calendar.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar">
            <CalendarDays className="h-4 w-4" /> Open calendar
          </Link>
        </Button>
      </div>

      {!isSupabaseConfigured && <SetupNotice />}

      <Section title="Today’s promotions" promotions={sections.today} href="/search?sort=today" />
      <Section title="New" promotions={sections.newest} href="/search?sort=newest" />
      <Section title="Ending soon" promotions={sections.endingSoon} href="/search?sort=ending" />
      <Section title="Trending" promotions={sections.trending} href="/search?sort=trending" />
      <Section title="Saved" promotions={sections.saved} href="/saved" />
    </div>
  );
}

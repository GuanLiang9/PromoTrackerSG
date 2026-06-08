import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PromoRow } from "@/components/promotions/promo-list";
import { SetupNotice } from "@/components/layout/setup-notice";
import { Button } from "@/components/ui/button";
import { getDashboardSections } from "@/lib/promotions/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CATEGORIES } from "@/lib/constants";
import type { Promotion } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Section({
  title,
  promotions,
  href,
  delay = 0,
}: {
  title: string;
  promotions: Promotion[];
  href?: string;
  delay?: number;
}) {
  return (
    <section
      className="animate-fade-in-up space-y-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            See all <ArrowRight className="h-3 w-3" />
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
      {/* Hero */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl dark:bg-emerald-500/6" />
        <div className="pointer-events-none absolute -bottom-10 right-40 h-40 w-40 rounded-full bg-violet-500/6 blur-2xl dark:bg-violet-500/5" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand" />
              Live in Singapore
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What's on today 🇸🇬
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Deals, events and discounts across Singapore — all in one place.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/calendar">
              <CalendarDays className="h-4 w-4" /> Open calendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Category quick-browse */}
      <div className="animate-fade-in-up animation-delay-100">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Browse by category
        </p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/search?categories=${cat.value}`}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-all hover:scale-105 hover:shadow-sm ${cat.chipClass}`}
            >
              {cat.emoji} {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {!isSupabaseConfigured && <SetupNotice />}

      <Section title="Today's promotions" promotions={sections.today} href="/search?sort=today" delay={150} />
      <Section title="New arrivals" promotions={sections.newest} href="/search?sort=newest" delay={200} />
      <Section title="Ending soon" promotions={sections.endingSoon} href="/search?sort=ending" delay={250} />
      <Section title="Trending" promotions={sections.trending} href="/search?sort=trending" delay={300} />
      <Section title="Saved" promotions={sections.saved} href="/saved" delay={350} />
    </div>
  );
}

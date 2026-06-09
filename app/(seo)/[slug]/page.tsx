import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PromoGrid } from "@/components/promotions/promo-list";
import { Button } from "@/components/ui/button";
import { searchPromotions } from "@/lib/promotions/queries";
import { getLanding, LANDING_PAGES } from "@/lib/seo/landing";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cfg = getLanding(slug);
  if (!cfg) return {};
  return {
    title: cfg.title,
    description: cfg.description,
    alternates: { canonical: `/${cfg.slug}` },
    openGraph: { title: cfg.title, description: cfg.description, type: "website" },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getLanding(slug);
  if (!cfg) notFound();

  const promotions = isSupabaseConfigured
    ? await searchPromotions(cfg.filters)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cfg.h1,
    description: cfg.description,
    numberOfItems: promotions.length,
    itemListElement: promotions.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `/promotions/${p.id}`,
    })),
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{cfg.h1}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{cfg.intro}</p>
      </header>

      <PromoGrid
        promotions={promotions}
        empty="No deals match right now — check back soon."
      />

      {/* Internal links to sibling landing pages for SEO crawlability. */}
      <nav className="flex flex-wrap gap-2 border-t pt-6">
        {LANDING_PAGES.filter((p) => p.slug !== cfg.slug).map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className="rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {p.h1}
          </Link>
        ))}
      </nav>

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Explore all promotions <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

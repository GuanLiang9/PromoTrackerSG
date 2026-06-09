import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Tag,
  ChevronLeft,
} from "lucide-react";
import { CategoryBadge } from "@/components/promotions/category-badge";
import { ScorePanel } from "@/components/promotions/score-badge";
import { SavedButton } from "@/components/promotions/saved-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPromotionById } from "@/lib/promotions/queries";
import { formatDateRange, endingInLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const promo = await getPromotionById(id);
  return { title: promo?.title ?? "Promotion" };
}

export default async function PromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await getPromotionById(id);
  if (!promo) notFound();

  const ending = endingInLabel(promo.endDate);

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      {promo.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promo.imageUrl}
          alt=""
          className="aspect-video w-full rounded-2xl object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={promo.category} />
        {ending && (
          <Badge className="bg-destructive/10 text-destructive">{ending}</Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {promo.title}
      </h1>

      <ScorePanel score={promo.baseScore} reasons={promo.scoreReasons} />

      <div className="grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {formatDateRange(promo.startDate, promo.endDate)}
        </span>
        {promo.location && (
          promo.latitude != null && promo.longitude != null ? (
            <Link
              href={`/map?id=${promo.id}`}
              className="inline-flex items-center gap-2 text-brand underline-offset-2 hover:underline"
            >
              <MapPin className="h-4 w-4" />
              {promo.location}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {promo.location}
            </span>
          )
        )}
        {promo.sourceName && (
          <span className="inline-flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Source: {promo.sourceName}
          </span>
        )}
      </div>

      {promo.description && (
        <p className="whitespace-pre-line leading-relaxed">
          {promo.description}
        </p>
      )}

      {promo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {promo.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {promo.terms && (
        <div className="rounded-xl border bg-muted/40 p-4">
          <h2 className="mb-1 text-sm font-semibold">Terms &amp; Conditions</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {promo.terms}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <SavedButton
          promotionId={promo.id}
          initialSaved={promo.isSaved ?? false}
          variant="full"
        />
        {promo.sourceUrl && (
          <Button asChild variant="outline" className="w-full">
            <a
              href={promo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" /> View source
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

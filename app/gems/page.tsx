import type { Metadata } from "next";
import { GemsClient } from "@/components/gems/gems-client";
import type { GemCategory } from "@/lib/gems/gems";

export const metadata: Metadata = {
  title: "Hidden Gems · Singapore",
  description: "Discover Singapore's most underrated spots — secret nature trails, heritage gems, art enclaves and neighbourhood treasures.",
};

export default async function GemsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const VALID: GemCategory[] = ["nature", "heritage", "art", "neighbourhood", "food"];
  const initial = VALID.includes(category as GemCategory) ? (category as GemCategory) : null;
  return <GemsClient initialCategory={initial} />;
}

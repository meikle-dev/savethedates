import { notFound } from "next/navigation";
import { getDevelopmentWedding } from "@/features/weddings/preview";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { publishedWedding, toWedding } from "@/features/weddings/published";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const { weddingSlug } = await params;
  const row = await publishedWedding(weddingSlug);
  const wedding = row ? toWedding(row, `/${weddingSlug}/photo`) : getDevelopmentWedding(weddingSlug);
  if (!wedding) notFound();
  return <SaveTheDate wedding={wedding} homeHref={`/${weddingSlug}`} detailsHref={row?.details_enabled ? `/${weddingSlug}/details` : undefined} />;
}

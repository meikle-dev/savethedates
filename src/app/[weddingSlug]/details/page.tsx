import { notFound } from "next/navigation";
import { publishedWeddingDetails } from "@/features/weddings/published";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";

export const dynamic = "force-dynamic";

export default async function DetailsPage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const { weddingSlug } = await params;
  const details = await publishedWeddingDetails(weddingSlug);
  if (!details) notFound();
  return <WeddingDetailsPageView details={details} homeHref={`/${weddingSlug}`} detailsHref={`/${weddingSlug}/details`} />;
}

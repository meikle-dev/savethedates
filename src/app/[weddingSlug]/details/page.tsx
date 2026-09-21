import { notFound } from "next/navigation";
import { publishedWedding, publishedWeddingDetails } from "@/features/weddings/published";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";

export const dynamic = "force-dynamic";

export default async function DetailsPage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const { weddingSlug } = await params;
  const [details, wedding] = await Promise.all([publishedWeddingDetails(weddingSlug), publishedWedding(weddingSlug)]);
  if (!details) notFound();
  return <WeddingDetailsPageView details={details} image={wedding?.photo_path ? { src: `/${weddingSlug}/photo`, alt: "" } : undefined} homeHref={`/${weddingSlug}`} detailsHref={`/${weddingSlug}/details`} rsvpHref={wedding?.rsvp_enabled ? `/${weddingSlug}/rsvp` : undefined} />;
}

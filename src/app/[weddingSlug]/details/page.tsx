import { notFound } from "next/navigation";
import { publishedWedding, publishedWeddingDetails } from "@/features/weddings/published";
import { sharedSecretFromSearchParam, weddingJourneyHrefs } from "@/features/weddings/invitation-context";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";

export const dynamic = "force-dynamic";

export default async function DetailsPage({ params, searchParams }: { params: Promise<{ weddingSlug: string }>; searchParams: Promise<{ share?: string | string[] }> }) {
  const [{ weddingSlug }, { share }] = await Promise.all([params, searchParams]);
  const [details, wedding] = await Promise.all([publishedWeddingDetails(weddingSlug), publishedWedding(weddingSlug)]);
  if (!details) notFound();
  const hrefs = weddingJourneyHrefs(weddingSlug, sharedSecretFromSearchParam(share));
  return <WeddingDetailsPageView details={details} image={wedding?.photo_path ? { src: `/${weddingSlug}/photo`, alt: "" } : undefined} photoFraming={details.photoFraming} homeHref={hrefs.home} detailsHref={hrefs.details} rsvpHref={wedding?.rsvp_enabled ? hrefs.rsvp : undefined} />;
}

import { notFound } from "next/navigation";
import { guestWeddingDetails, requireGuestWedding } from "@/features/weddings/published";
import { guestMetadata } from "@/features/weddings/guest-metadata";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ names: string; secret: string }> }) {
  return guestMetadata((await params).secret, "details");
}

export default async function DetailsPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await requireGuestWedding(names, secret, "details");
  const details = await guestWeddingDetails(secret);
  if (!details) notFound();
  return <WeddingDetailsPageView details={details} image={wedding.photo_path ? { src: `${hrefs.home}/photo`, alt: "" } : undefined} photoFraming={details.photoFraming} homeHref={hrefs.home} invitationHref={wedding.invitation_enabled ? hrefs.invitation : undefined} detailsHref={hrefs.details} rsvpHref={wedding.rsvp_enabled ? hrefs.rsvp : undefined} />;
}

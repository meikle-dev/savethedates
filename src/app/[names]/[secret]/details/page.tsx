import { notFound } from "next/navigation";
import { guestWeddingDetails, requireGuestWedding } from "@/features/weddings/published";
import { guestMetadata } from "@/features/weddings/guest-metadata";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { linkNavigation } from "@/features/weddings/guest-link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ names: string; secret: string }> }) {
  return guestMetadata((await params).secret, "details");
}

export default async function DetailsPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await requireGuestWedding(names, secret, "details");
  const details = await guestWeddingDetails(secret);
  if (!details) notFound();
  return <WeddingDetailsPageView details={details} image={wedding.photo_path ? { src: `${hrefs.home}/photo`, alt: "" } : undefined} photoFraming={details.photoFraming} {...linkNavigation(wedding.link, wedding, hrefs)} detailsHref={hrefs.details} credit="guest-site" />;
}

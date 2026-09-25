import { SaveTheDate } from "@/features/weddings/save-the-date";
import { requireGuestWedding, toWedding } from "@/features/weddings/published";
import { guestMetadata } from "@/features/weddings/guest-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ names: string; secret: string }> }) {
  return guestMetadata((await params).secret, "home");
}

export default async function WeddingPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await requireGuestWedding(names, secret, "home");
  return <SaveTheDate wedding={toWedding(wedding, `${hrefs.home}/photo`)} homeHref={hrefs.home} invitationHref={wedding.invitation_enabled ? hrefs.invitation : undefined} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={wedding.rsvp_enabled ? hrefs.rsvp : undefined} />;
}

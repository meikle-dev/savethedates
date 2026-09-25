import { SaveTheDate } from "@/features/weddings/save-the-date";
import { requireGuestWedding, toWedding } from "@/features/weddings/published";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await requireGuestWedding(names, secret, "home");
  return <SaveTheDate wedding={toWedding(wedding, `${hrefs.home}/photo`)} homeHref={hrefs.home} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={wedding.rsvp_enabled ? hrefs.rsvp : undefined} reply={wedding.rsvp_open ? { href: hrefs.rsvp, closesOn: wedding.rsvp_closes_on } : undefined} />;
}

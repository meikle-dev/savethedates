import { notFound } from "next/navigation";
import { guestWeddingInvitation, requireGuestWedding } from "@/features/weddings/published";
import { guestMetadata } from "@/features/weddings/guest-metadata";
import { InvitationPageView } from "@/features/weddings/invitation-view";
import { linkNavigation } from "@/features/weddings/guest-link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ names: string; secret: string }> }) {
  return guestMetadata((await params).secret, "invitation");
}

export default async function InvitationPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await requireGuestWedding(names, secret, "invitation");
  const invitation = await guestWeddingInvitation(secret);
  if (!invitation) notFound();
  const { first_name, second_name, wedding_date, location, theme } = wedding;
  return <InvitationPageView
    invitation={{ ...invitation, first_name, second_name, wedding_date, location, theme }}
    {...linkNavigation(wedding.link, wedding, hrefs)} invitationHref={hrefs.invitation}
    reply={wedding.rsvp_enabled ? { href: hrefs.rsvp, open: wedding.rsvp_open, closesOn: wedding.rsvp_closes_on } : undefined} />;
}

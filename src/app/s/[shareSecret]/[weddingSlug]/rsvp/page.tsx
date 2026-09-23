import { notFound } from "next/navigation";
import { invitationTokenPattern } from "@/features/weddings/invitation-context";
import { publishedSharedRsvp, publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function SharedRsvpPage({ params }: { params: Promise<{ shareSecret: string; weddingSlug: string }> }) {
  const { shareSecret, weddingSlug } = await params;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  const access = invitationTokenPattern.test(shareSecret) ? await publishedSharedRsvp(weddingSlug, shareSecret) : null;
  const guest = access ? {
    first_name: wedding.first_name, second_name: wedding.second_name, theme: wedding.theme,
    invite_name: "", responding_name: null, attending: null, responded_at: null,
    is_open: access.is_open, closes_on: null,
  } : null;
  return <RsvpPage wedding={wedding} guest={guest} slug={weddingSlug} token={null} sharedSecret={access ? shareSecret : null} />;
}

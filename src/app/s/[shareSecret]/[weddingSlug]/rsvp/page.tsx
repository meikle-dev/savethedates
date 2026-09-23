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
  return <RsvpPage wedding={wedding} access={access} slug={weddingSlug} sharedSecret={access ? shareSecret : null} />;
}

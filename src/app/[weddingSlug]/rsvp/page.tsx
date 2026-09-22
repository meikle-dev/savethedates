import { notFound } from "next/navigation";
import { invitationTokenFromSearchParam } from "@/features/weddings/invitation-context";
import { publishedGuestRsvp, publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function GuestRsvpPage({ params, searchParams }: { params: Promise<{ weddingSlug: string }>; searchParams: Promise<{ invite?: string | string[] }> }) {
  const { weddingSlug } = await params;
  const { invite } = await searchParams;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  const token = invitationTokenFromSearchParam(invite);
  const guest = token ? await publishedGuestRsvp(weddingSlug, token) : null;
  return <RsvpPage wedding={wedding} guest={guest} slug={weddingSlug} token={token} />;
}

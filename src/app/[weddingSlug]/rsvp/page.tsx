import { notFound } from "next/navigation";
import { invitationTokenSchema } from "@/features/weddings/rsvp";
import { publishedGuestRsvp, publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function GuestRsvpPage({ params, searchParams }: { params: Promise<{ weddingSlug: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { weddingSlug } = await params;
  const { invite } = await searchParams;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  const parsedToken = invitationTokenSchema.safeParse(invite);
  const guest = parsedToken.success ? await publishedGuestRsvp(weddingSlug, parsedToken.data) : null;
  return <RsvpPage wedding={wedding} guest={guest} slug={weddingSlug} token={parsedToken.success ? parsedToken.data : null} />;
}

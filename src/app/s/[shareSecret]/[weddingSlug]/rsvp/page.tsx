import { notFound } from "next/navigation";
import { log, withLogging } from "@/lib/logger";
import { invitationTokenPattern } from "@/features/weddings/invitation-context";
import { publishedSharedRsvp, publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function SharedRsvpPage({ params }: { params: Promise<{ shareSecret: string; weddingSlug: string }> }) {
  const { shareSecret, weddingSlug } = await params;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  const access = await withLogging("rsvp.link", "/s/[shareSecret]/[weddingSlug]/rsvp", async () => {
    const wellFormed = invitationTokenPattern.test(shareSecret);
    const result = wellFormed ? await publishedSharedRsvp(weddingSlug, shareSecret) : null;
    if (!result) log.warn("rsvp.link.rejected", { reason: wellFormed ? "unknown_secret" : "malformed_secret" });
    return result;
  });
  return <RsvpPage wedding={wedding} access={access} slug={weddingSlug} sharedSecret={access ? shareSecret : null} />;
}

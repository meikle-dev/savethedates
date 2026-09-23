import { notFound } from "next/navigation";
import { getDevelopmentWedding } from "@/features/weddings/preview";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { publishedWedding, toWedding } from "@/features/weddings/published";
import { sharedSecretFromSearchParam, weddingJourneyHrefs } from "@/features/weddings/invitation-context";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params, searchParams }: { params: Promise<{ weddingSlug: string }>; searchParams: Promise<{ share?: string | string[] }> }) {
  const [{ weddingSlug }, { share }] = await Promise.all([params, searchParams]);
  const row = await publishedWedding(weddingSlug);
  const wedding = row ? toWedding(row, `/${weddingSlug}/photo`) : getDevelopmentWedding(weddingSlug);
  if (!wedding) notFound();
  const hrefs = weddingJourneyHrefs(weddingSlug, sharedSecretFromSearchParam(share));
  return <SaveTheDate wedding={wedding} homeHref={hrefs.home} detailsHref={row?.details_enabled ? hrefs.details : undefined} rsvpHref={row?.rsvp_enabled ? hrefs.rsvp : undefined} />;
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sharedRsvpHref } from "@/features/weddings/invitation-context";
import { publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function GuestRsvpPage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const { weddingSlug } = await params;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    const { data: owned } = await client.from("weddings").select("rsvp_share_secret").eq("owner_id", user.id).eq("slug", weddingSlug).maybeSingle();
    if (owned) redirect(sharedRsvpHref(weddingSlug, owned.rsvp_share_secret));
  }
  return <RsvpPage wedding={wedding} access={null} slug={weddingSlug} />;
}

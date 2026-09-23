import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invitationTokenFromSearchParam } from "@/features/weddings/invitation-context";
import { publishedGuestRsvp, publishedWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function GuestRsvpPage({ params, searchParams }: { params: Promise<{ weddingSlug: string }>; searchParams: Promise<{ invite?: string | string[] }> }) {
  const { weddingSlug } = await params;
  const { invite } = await searchParams;
  const wedding = await publishedWedding(weddingSlug);
  if (!wedding) notFound();
  if (invite === undefined) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { data: owned } = await client.from("weddings").select("id").eq("owner_id", user.id).eq("slug", weddingSlug).maybeSingle();
      if (owned) redirect("/dashboard/preview/rsvp");
    }
  }
  const token = invitationTokenFromSearchParam(invite);
  const guest = token ? await publishedGuestRsvp(weddingSlug, token) : null;
  return <RsvpPage wedding={wedding} guest={guest} slug={weddingSlug} token={token} />;
}

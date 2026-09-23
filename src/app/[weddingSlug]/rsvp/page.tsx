import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    const { data: owned } = await client.from("weddings").select("id").eq("owner_id", user.id).eq("slug", weddingSlug).maybeSingle();
    if (owned) redirect("/dashboard/preview/rsvp");
  }
  return <RsvpPage wedding={wedding} access={null} slug={weddingSlug} />;
}

import type { Metadata } from "next";
import { appOrigin } from "@/lib/supabase/config";
import { currentNames } from "@/features/weddings/guest-link";
import { PublicationForm } from "@/features/workspace/publication-form";
import { guestLinkShare, requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Publish · SaveTheDates" };

export default async function Publish({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [{ wedding, entitlement, live }, params] = await Promise.all([requireWedding(), searchParams]);
  return <WorkspacePage id="share-title" eyebrow="Publish" title="Share your site" intro={live ? "Your site is live for anyone with your guest link." : "Your site is private until you publish it."}>
    <div className="ws-stack">
      <PublicationForm origin={appOrigin()} names={currentNames(wedding)} secret={wedding.rsvp_share_secret} published={live} entitlement={entitlement} checkout={params.checkout} share={guestLinkShare(wedding, live)} />
    </div>
  </WorkspacePage>;
}

import type { Metadata } from "next";
import { appOrigin } from "@/lib/supabase/config";
import { currentNames } from "@/features/weddings/guest-link";
import { PublicationForm } from "@/features/workspace/publication-form";
import { guestLinkShares, requireWedding, rsvpReadiness } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Publish · SaveTheDates" };

export default async function Publish({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [{ wedding, entitlement, live, offline }, params] = await Promise.all([requireWedding(), searchParams]);
  return <WorkspacePage id="share-title" eyebrow="Publish" title="Share your site" intro={live ? "Your site is live for anyone with your guest links." : offline ? "Your published site is offline because its purchase is no longer active." : "Your site is private until you publish it."}>
    <div className="ws-stack">
      <PublicationForm origin={appOrigin()} names={currentNames(wedding)} secrets={{ saveTheDate: wedding.rsvp_share_secret, invitation: wedding.invitation_enabled ? wedding.invitation_share_secret : null }} published={live} offline={offline} entitlement={entitlement} checkout={params.checkout} shares={guestLinkShares(wedding, live)} rsvp={rsvpReadiness(wedding, live, offline)} />
    </div>
  </WorkspacePage>;
}

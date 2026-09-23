import type { Metadata } from "next";
import { RsvpManager } from "@/features/workspace/rsvp-manager";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "RSVP · SaveTheDates" };

export default async function Rsvp() {
  const { wedding } = await requireWedding();
  return <WorkspacePage id="rsvp-title" eyebrow="RSVP" title="RSVP" intro="Share one private link with all guests, then see their named responses in Guests.">
    <RsvpManager enabled={wedding.rsvp_enabled} closesOn={wedding.rsvp_closes_on} slug={wedding.slug} shareSecret={wedding.rsvp_share_secret} />
  </WorkspacePage>;
}

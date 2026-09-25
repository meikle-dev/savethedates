import type { Metadata } from "next";
import { RsvpManager } from "@/features/workspace/rsvp-manager";
import { currentGuestUrl, requireWedding, rsvpReadiness } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "RSVP · SaveTheDates" };

export default async function Rsvp() {
  const { wedding, live, offline } = await requireWedding();
  return <WorkspacePage id="rsvp-title" eyebrow="RSVP" title="RSVP" intro="Manage your guest link and RSVP settings. See named responses in Guests.">
    <RsvpManager enabled={wedding.rsvp_enabled} closesOn={wedding.rsvp_closes_on} guestUrl={currentGuestUrl(wedding)} live={live} status={rsvpReadiness(wedding, live, offline)} />
  </WorkspacePage>;
}

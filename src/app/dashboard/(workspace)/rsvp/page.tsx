import type { Metadata } from "next";
import { RsvpManager } from "@/features/workspace/rsvp-manager";
import { currentGuestLinks, requireWedding, rsvpReadiness } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";
import { parseMealMenu } from "@/features/weddings/meal-menu";
import { rsvpLink } from "@/features/weddings/guest-link";

export const metadata: Metadata = { title: "RSVP · SaveTheDates" };

export default async function Rsvp() {
  const { wedding, live, offline } = await requireWedding();
  return <WorkspacePage id="rsvp-title" eyebrow="RSVP" title="RSVP" intro="Manage your RSVP link and settings. See named responses in Guests.">
    <RsvpManager enabled={wedding.rsvp_enabled} closesOn={wedding.rsvp_closes_on} rsvpUrl={currentGuestLinks(wedding).rsvp} via={rsvpLink(wedding)} live={live} status={rsvpReadiness(wedding, live, offline)} meals={{ enabled: wedding.meal_choices_enabled, menu: parseMealMenu(wedding.meal_menu) }} />
  </WorkspacePage>;
}

import { log, withLogging } from "@/lib/logger";
import { guestRsvpMenu, requireGuestWedding } from "@/features/weddings/published";
import { guestMetadata } from "@/features/weddings/guest-metadata";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ names: string; secret: string }> }) {
  return guestMetadata((await params).secret, "rsvp");
}

export default async function GuestRsvpPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await withLogging("rsvp.link", "/[names]/[secret]/rsvp", () =>
    requireGuestWedding(names, secret, "rsvp", (reason) => log.warn("rsvp.link.rejected", { reason })));
  // RsvpPage is a client component: pass only what it renders, never photo_path or other row fields.
  const { first_name, second_name, theme, details_enabled, rsvp_enabled, invitation_enabled } = wedding;
  // The menu is projected only while RSVP is open and meal choices are on; it never includes replies.
  const menu = wedding.rsvp_open ? await guestRsvpMenu(secret) : null;
  return <RsvpPage wedding={{ first_name, second_name, theme, details_enabled, rsvp_enabled, invitation_enabled }} hrefs={hrefs} open={wedding.rsvp_open} closesOn={wedding.rsvp_closes_on} secret={secret} menu={menu} />;
}

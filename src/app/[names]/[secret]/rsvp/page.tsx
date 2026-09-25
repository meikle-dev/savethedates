import { log, withLogging } from "@/lib/logger";
import { requireGuestWedding } from "@/features/weddings/published";
import { RsvpPage } from "@/features/weddings/rsvp-page";

export const dynamic = "force-dynamic";

export default async function GuestRsvpPage({ params }: { params: Promise<{ names: string; secret: string }> }) {
  const { names, secret } = await params;
  const { wedding, hrefs } = await withLogging("rsvp.link", "/[names]/[secret]/rsvp", () =>
    requireGuestWedding(names, secret, "rsvp", (reason) => log.warn("rsvp.link.rejected", { reason })));
  // RsvpPage is a client component: pass only what it renders, never photo_path or other row fields.
  const { first_name, second_name, theme, details_enabled, rsvp_enabled } = wedding;
  return <RsvpPage wedding={{ first_name, second_name, theme, details_enabled, rsvp_enabled }} hrefs={hrefs} open={wedding.rsvp_open} closesOn={wedding.rsvp_closes_on} secret={secret} />;
}

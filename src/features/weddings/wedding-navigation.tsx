import Link from "next/link";

export type WeddingPage = "home" | "invitation" | "details" | "rsvp";

// Links appear only for pages that are switched on, in guest order.
export function WeddingNavigation({ homeHref, invitationHref, detailsHref, rsvpHref, current }: { homeHref: string; invitationHref?: string; detailsHref?: string; rsvpHref?: string; current: WeddingPage }) {
  if (!invitationHref && !detailsHref && !rsvpHref) return null;
  return <nav aria-label="Wedding site" className="wedding-navigation">
    <Link href={homeHref} aria-current={current === "home" ? "page" : undefined}>Save the date</Link>
    {invitationHref && <Link href={invitationHref} aria-current={current === "invitation" ? "page" : undefined}>Invitation</Link>}
    {detailsHref && <Link href={detailsHref} aria-current={current === "details" ? "page" : undefined}>Details</Link>}
    {rsvpHref && <Link href={rsvpHref} aria-current={current === "rsvp" ? "page" : undefined}>RSVP</Link>}
  </nav>;
}

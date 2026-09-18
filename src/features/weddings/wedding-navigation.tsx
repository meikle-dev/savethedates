import Link from "next/link";

export function WeddingNavigation({ homeHref, detailsHref, rsvpHref, current }: { homeHref: string; detailsHref?: string; rsvpHref?: string; current: "home" | "details" | "rsvp" }) {
  if (!detailsHref && !rsvpHref) return null;
  return <nav aria-label="Wedding site" className="wedding-navigation">
    <Link href={homeHref} aria-current={current === "home" ? "page" : undefined}>Save the date</Link>
    {detailsHref && <Link href={detailsHref} aria-current={current === "details" ? "page" : undefined}>Details</Link>}
    {rsvpHref && <Link href={rsvpHref} aria-current={current === "rsvp" ? "page" : undefined}>RSVP</Link>}
  </nav>;
}

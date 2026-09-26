import "server-only";
import type { Metadata } from "next";
import { marketingOrigin } from "@/features/marketing/metadata";
import { guestPageAvailable, guestWedding, guestWeddingDetails, guestWeddingInvitation } from "./published";
import type { GuestPage } from "./guest-link";
import { formatWeddingDate } from "./wedding";

const unavailable: Metadata = {
  title: "Page not found | SaveTheDates",
  robots: { index: false, follow: false },
};

export async function guestMetadata(secret: string, page: GuestPage): Promise<Metadata> {
  const wedding = await guestWedding(secret);
  if (!wedding || !guestPageAvailable(wedding, page) || (page === "details" && !await guestWeddingDetails(secret)) || (page === "invitation" && !await guestWeddingInvitation(secret))) return unavailable;

  const names = `${wedding.first_name} & ${wedding.second_name}`;
  const date = formatWeddingDate(wedding.wedding_date);
  const image = {
    url: `${marketingOrigin()}/assets/share/${wedding.theme}.jpg`,
    width: 1200,
    height: 630,
    alt: wedding.link === "invitation" ? "Wedding invitation card" : "Save the Date invitation card",
  };
  const pageTitle = { home: "Save the Date", invitation: "Invitation", details: "Details", rsvp: "RSVP" }[page];
  // F065: a preview names what was sent. The RSVP link previews as the RSVP; every other page as its link.
  const shareTitle = page === "rsvp" ? `RSVP for ${names}’s wedding` : `${names} · ${wedding.link === "invitation" ? "Invitation" : "Save the Date"}`;

  return {
    title: `${pageTitle} · ${names} | SaveTheDates`,
    description: date,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "SaveTheDates",
      title: shareTitle,
      description: date,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: date, images: [image.url] },
  };
}

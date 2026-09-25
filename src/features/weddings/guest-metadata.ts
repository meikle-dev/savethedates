import "server-only";
import type { Metadata } from "next";
import { marketingOrigin } from "@/features/marketing/metadata";
import { guestWedding, guestWeddingDetails, guestWeddingInvitation } from "./published";
import { formatWeddingDate } from "./wedding";

type GuestPage = "home" | "invitation" | "details" | "rsvp";

const unavailable: Metadata = {
  title: "Page not found | SaveTheDates",
  robots: { index: false, follow: false },
};

export async function guestMetadata(secret: string, page: GuestPage): Promise<Metadata> {
  const wedding = await guestWedding(secret);
  if (!wedding || (page === "details" && !await guestWeddingDetails(secret)) || (page === "invitation" && !await guestWeddingInvitation(secret))) return unavailable;

  const names = `${wedding.first_name} & ${wedding.second_name}`;
  const date = formatWeddingDate(wedding.wedding_date);
  const image = {
    url: `${marketingOrigin()}/assets/share/${wedding.theme}.jpg`,
    width: 1200,
    height: 630,
    alt: "Save the Date invitation card",
  };
  const pageTitle = { home: "Save the Date", invitation: "Invitation", details: "Details", rsvp: "RSVP" }[page];

  return {
    title: `${pageTitle} · ${names} | SaveTheDates`,
    description: date,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "SaveTheDates",
      title: `${names} · Save the Date`,
      description: date,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: `${names} · Save the Date`, description: date, images: [image.url] },
  };
}

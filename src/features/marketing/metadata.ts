import type { Metadata } from "next";
export function marketingOrigin() { return new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin; }
export const digitalSaveTheDatePath = "/digital-save-the-date";
export const whatWeOfferPath = "/what-we-offer";
/** F077: the save the date wording guide. `guides` is already a reserved names part, so no migration is needed. */
export const saveTheDateWordingPath = "/guides/save-the-date-wording";
/** F070: the example pages shown inside the showcase phones (noindex, not in the sitemap). */
export const offerPhonePath = (theme: string) => `${whatWeOfferPath}/phone/${theme}`;
export const supportEmail = "hello@savethedates.co.uk";

const defaultShareImage = { path: "/media/share", alt: "SaveTheDates — Your wedding website, beautifully done. Save the Date, invitation and RSVP. One £19 payment." };

function indexedPage(path: string, title: string, description: string, image = defaultShareImage): Metadata {
  const origin = marketingOrigin();
  const url = path === "/" ? origin : `${origin}${path}`;
  const images = [{ url: `${origin}${image.path}`, width: 1200, height: 630, alt: image.alt }];
  return { title, description, alternates: { canonical: url }, robots: { index: true, follow: true }, openGraph: { type: "website", locale: "en_GB", siteName: "SaveTheDates", title, description, url, images }, twitter: { card: "summary_large_image", title, description, images } };
}

export function homeMetadata(): Metadata {
  return indexedPage("/", "Digital save the date & wedding website with RSVP | SaveTheDates", "Your Save the Date, invitation, wedding details and RSVPs with meal choices and dietary requirements, on one beautiful wedding website. Free to build, £19 once.");
}

export function digitalSaveTheDateMetadata(): Metadata {
  return indexedPage(digitalSaveTheDatePath, "Digital save the date with online RSVP | SaveTheDates", "A digital save the date your guests open from a link on WhatsApp, text or email, with your wedding details and RSVP. Twelve designs, £19 once.");
}

export function whatWeOfferMetadata(): Metadata {
  return indexedPage(whatWeOfferPath, "What we offer: wedding website, invitation & RSVP with meal choices | SaveTheDates",
    "See everything your wedding website includes: Save the Date, invitation, wedding details and RSVPs with meal choices and dietary requirements. Try it in any of twelve designs.",
    { path: "/media/share?page=offer", alt: "SaveTheDates — Everything we offer. Save the Date, invitation, details and RSVP in twelve designs." });
}

export function saveTheDateWordingMetadata(): Metadata {
  return indexedPage(saveTheDateWordingPath, "Save the date wording for WhatsApp, text & email | SaveTheDates",
    "Copy-and-paste save the date wording for WhatsApp, text and email, from relaxed to formal, plus a free planner showing when to send your save the dates and invitations.");
}

/** Site name and publisher for Google; only on the homepage, which Google reads for the site name. */
export function homeStructuredData() {
  const origin = marketingOrigin();
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: "SaveTheDates", url: `${origin}/` },
    { "@context": "https://schema.org", "@type": "Organization", name: "SaveTheDates", url: `${origin}/`, logo: `${origin}/icon-512.png` },
  ];
}

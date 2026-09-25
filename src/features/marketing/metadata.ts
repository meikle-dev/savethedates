import type { Metadata } from "next";
export function marketingOrigin() { return new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin; }
export const digitalSaveTheDatePath = "/digital-save-the-date";
export const supportEmail = "hello@savethedates.co.uk";

function indexedPage(path: string, title: string, description: string): Metadata {
  const origin = marketingOrigin();
  const url = path === "/" ? origin : `${origin}${path}`;
  const images = [{ url: `${origin}/media/share`, width: 1200, height: 630, alt: "SaveTheDates — Your wedding website, beautifully done. Twelve themes. One £29 payment." }];
  return { title, description, alternates: { canonical: url }, robots: { index: true, follow: true }, openGraph: { type: "website", locale: "en_GB", siteName: "SaveTheDates", title, description, url, images }, twitter: { card: "summary_large_image", title, description, images } };
}

export function homeMetadata(): Metadata {
  return indexedPage("/", "Digital save the date & wedding website with RSVP | SaveTheDates", "Send your save the date by WhatsApp, text or email. One link opens your wedding details and online RSVP. Twelve themes, one £29 payment, free to preview.");
}

export function digitalSaveTheDateMetadata(): Metadata {
  return indexedPage(digitalSaveTheDatePath, "Digital save the date with online RSVP | SaveTheDates", "A digital save the date your guests open from one link on WhatsApp, text or email, with your wedding details and RSVP. Twelve designs, £29 once.");
}

/** Site name and publisher for Google; only on the homepage, which Google reads for the site name. */
export function homeStructuredData() {
  const origin = marketingOrigin();
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: "SaveTheDates", url: `${origin}/` },
    { "@context": "https://schema.org", "@type": "Organization", name: "SaveTheDates", url: `${origin}/`, logo: `${origin}/icon-512.png` },
  ];
}

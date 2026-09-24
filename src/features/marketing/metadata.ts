import type { Metadata } from "next";
export function marketingOrigin() { return new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin; }
export function homeMetadata(): Metadata {
  const origin = marketingOrigin();
  const title = "Wedding websites, beautifully done | SaveTheDates";
  const description = "Share your save the date, wedding details and collect RSVPs in one beautiful website. Twelve themes, one £29 payment. Create and preview your draft for free.";
  const images = [{ url: `${origin}/media/share`, width: 1200, height: 630, alt: "SaveTheDates — Your wedding website, beautifully done. Twelve themes. One £29 payment." }];
  return { title, description, alternates: { canonical: origin }, robots: { index: true, follow: true }, openGraph: { type: "website", locale: "en_GB", siteName: "SaveTheDates", title, description, url: origin, images }, twitter: { card: "summary_large_image", title, description, images } };
}

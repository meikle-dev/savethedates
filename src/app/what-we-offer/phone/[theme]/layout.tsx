import "@/app/app.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isWeddingTheme, themes } from "@/features/weddings/themes";

// F070: the fictional example pages shown inside the phones on /what-we-offer, without the example banner.
export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params;
  const name = themes.find((item) => item.id === theme)?.name;
  return { title: name ? `${name} example | SaveTheDates` : "Page not found | SaveTheDates", robots: { index: false, follow: false } };
}

export default async function OfferPhoneLayout({ children, params }: { children: React.ReactNode; params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return children;
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { exampleDetails, exampleWedding } from "@/features/marketing/example-data";

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params;
  const name = themes.find((item) => item.id === theme)?.name;
  return { title: name ? `${name} example · Details | SaveTheDates` : "Page not found | SaveTheDates" };
}
export default async function ExampleDetailsPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  const wedding = exampleWedding(theme);
  return <WeddingDetailsPageView details={exampleDetails(theme)} image={wedding.image} photoFraming={wedding.photoFraming} homeHref={`/examples/${theme}`} detailsHref={`/examples/${theme}/details`} photoLabel="Your photo here" />;
}

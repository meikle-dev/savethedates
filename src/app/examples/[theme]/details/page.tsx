import { notFound } from "next/navigation";
import { isWeddingTheme } from "@/features/weddings/themes";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { exampleDetails } from "@/features/marketing/example-data";
export default async function ExampleDetailsPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return <WeddingDetailsPageView details={exampleDetails(theme)} homeHref={`/examples/${theme}`} detailsHref={`/examples/${theme}/details`} />;
}

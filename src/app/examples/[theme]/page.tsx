import { notFound } from "next/navigation";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { exampleWedding } from "@/features/marketing/example-data";
export function generateStaticParams() { return themes.map(({ id }) => ({ theme: id })); }
export default async function ExamplePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return <SaveTheDate wedding={exampleWedding(theme)} homeHref={`/examples/${theme}`} detailsHref={`/examples/${theme}/details`} photoLabel="Your photo here" />;
}

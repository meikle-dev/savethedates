import { notFound } from "next/navigation";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { ExamplePage } from "@/features/marketing/example-pages";

export function generateStaticParams() { return themes.map(({ id }) => ({ theme: id })); }

export default async function ExampleSaveTheDatePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return <ExamplePage theme={theme} page="save-the-date" base={`/examples/${theme}`} />;
}

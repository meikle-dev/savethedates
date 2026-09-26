import { notFound } from "next/navigation";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { ExamplePage, examplePageNames, type ExamplePageName } from "@/features/marketing/example-pages";
import { offerPhonePath } from "@/features/marketing/metadata";

// The Save the Date is the bare theme path; the other pages sit under it, as on a guest link.
const pageFor = (segments?: string[]): ExamplePageName | null => {
  if (!segments?.length) return "save-the-date";
  const [name, ...rest] = segments;
  return rest.length === 0 && name !== "save-the-date" && examplePageNames.includes(name as ExamplePageName) ? name as ExamplePageName : null;
};

export function generateStaticParams() {
  return themes.flatMap(({ id }) => examplePageNames.map((name) => ({ theme: id, page: name === "save-the-date" ? [] : [name] })));
}

export default async function OfferPhonePage({ params }: { params: Promise<{ theme: string; page?: string[] }> }) {
  const { theme, page: segments } = await params;
  const page = pageFor(segments);
  if (!isWeddingTheme(theme) || !page) notFound();
  return <ExamplePage theme={theme} page={page} base={offerPhonePath(theme)} />;
}

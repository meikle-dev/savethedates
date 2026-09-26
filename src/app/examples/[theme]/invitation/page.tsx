import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { ExamplePage } from "@/features/marketing/example-pages";

export function generateStaticParams() { return themes.map(({ id }) => ({ theme: id })); }

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params;
  const name = themes.find((item) => item.id === theme)?.name;
  return { title: name ? `${name} example · Invitation | SaveTheDates` : "Page not found | SaveTheDates" };
}

export default async function ExampleInvitationPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return <ExamplePage theme={theme} page="invitation" base={`/examples/${theme}`} />;
}

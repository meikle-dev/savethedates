import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { InvitationPageView } from "@/features/weddings/invitation-view";
import { exampleInvitation } from "@/features/marketing/example-data";

export function generateStaticParams() { return themes.map(({ id }) => ({ theme: id })); }

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params;
  const name = themes.find((item) => item.id === theme)?.name;
  return { title: name ? `${name} example · Invitation | SaveTheDates` : "Page not found | SaveTheDates" };
}

// Examples have no RSVP page, so the invitation shows no reply section.
export default async function ExampleInvitationPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  return <InvitationPageView invitation={exampleInvitation(theme)} homeHref={`/examples/${theme}`} invitationHref={`/examples/${theme}/invitation`} detailsHref={`/examples/${theme}/details`} />;
}

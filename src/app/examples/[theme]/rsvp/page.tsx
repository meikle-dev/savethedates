import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { RsvpPage } from "@/features/weddings/rsvp-page";
import { exampleRsvpClosesOn } from "@/features/marketing/example-data";

export function generateStaticParams() { return themes.map(({ id }) => ({ theme: id })); }

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params;
  const name = themes.find((item) => item.id === theme)?.name;
  return { title: name ? `${name} example · RSVP | SaveTheDates` : "Page not found | SaveTheDates" };
}

// With no secret the page is in preview mode: the form can be filled in but never submits, and nothing is saved.
export default async function ExampleRsvpPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  const home = `/examples/${theme}`;
  return <RsvpPage
    wedding={{ first_name: "Olivia", second_name: "James", theme, details_enabled: true, rsvp_enabled: true, invitation_enabled: true }}
    hrefs={{ home, invitation: `${home}/invitation`, details: `${home}/details`, rsvp: `${home}/rsvp` }}
    open closesOn={exampleRsvpClosesOn} secret={null}
    previewNote="Example only. Nothing you enter here is sent or saved." />;
}

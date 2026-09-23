import Link from "next/link";
import { notFound } from "next/navigation";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { Icon } from "@/features/workspace/workspace-icons";
export const metadata = { title: "Fictional wedding theme example | SaveTheDates", robots: { index: false, follow: false } };
export default async function ExampleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isWeddingTheme(theme)) notFound();
  // Native navigation avoids a production router hash duplication on the return trip.
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  return <><div className="platform example-banner"><a href="/#themes" className="button button-quiet"><Icon name="arrowLeft" />All themes</a><p><strong>{themes.find((item) => item.id === theme)?.name}</strong><span>Fictional wedding example</span></p><Link className="button button-primary" href="/account/sign-up">Create your save the date</Link></div>{children}</>;
}

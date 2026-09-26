import { WhatWeOffer } from "@/features/marketing/what-we-offer";
import { whatWeOfferMetadata } from "@/features/marketing/metadata";
import { isSignedIn } from "@/features/marketing/session";
import { isWeddingTheme } from "@/features/weddings/themes";

export const dynamic = "force-dynamic";
export const generateMetadata = whatWeOfferMetadata;

// ?theme= comes from the design switcher when JavaScript is off; the canonical URL stays /what-we-offer.
export default async function WhatWeOfferPage({ searchParams }: { searchParams: Promise<{ theme?: string | string[] }> }) {
  const { theme } = await searchParams;
  return <WhatWeOffer isAuthenticated={await isSignedIn()} theme={isWeddingTheme(theme) ? theme : "minimal"} />;
}

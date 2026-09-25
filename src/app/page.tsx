import { MarketingHome } from "@/features/marketing/home";
import { homeMetadata } from "@/features/marketing/metadata";
import { isSignedIn } from "@/features/marketing/session";

export const dynamic = "force-dynamic";
export const generateMetadata = homeMetadata;

export default async function Home() {
  return <MarketingHome isAuthenticated={await isSignedIn()} />;
}

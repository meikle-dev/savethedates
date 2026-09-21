import { MarketingHome } from "@/features/marketing/home";
import { homeMetadata } from "@/features/marketing/metadata";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const generateMetadata = homeMetadata;

export default async function Home() {
  let isAuthenticated = false;

  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    isAuthenticated = Boolean(user);
  } catch {
    // Marketing remains available when account state cannot be verified.
  }

  return <MarketingHome isAuthenticated={isAuthenticated} />;
}

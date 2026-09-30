import { SaveTheDateWording } from "@/features/marketing/save-the-date-wording";
import { saveTheDateWordingMetadata } from "@/features/marketing/metadata";
import { isSignedIn } from "@/features/marketing/session";

// Dynamic so the canonical URL uses the runtime APP_ORIGIN; one image serves every environment.
export const dynamic = "force-dynamic";
export const generateMetadata = saveTheDateWordingMetadata;

export default async function SaveTheDateWordingPage() {
  return <SaveTheDateWording isAuthenticated={await isSignedIn()} />;
}

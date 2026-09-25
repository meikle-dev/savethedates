import { DigitalSaveTheDate } from "@/features/marketing/digital-save-the-date";
import { digitalSaveTheDateMetadata } from "@/features/marketing/metadata";
import { isSignedIn } from "@/features/marketing/session";

// Dynamic so the canonical URL uses the runtime APP_ORIGIN; one image serves every environment.
export const dynamic = "force-dynamic";
export const generateMetadata = digitalSaveTheDateMetadata;

export default async function DigitalSaveTheDatePage() {
  return <DigitalSaveTheDate isAuthenticated={await isSignedIn()} />;
}

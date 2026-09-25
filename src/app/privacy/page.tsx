import { legalMetadata, PrivacyNotice } from "@/features/marketing/legal";
import { legalPaths } from "@/features/marketing/legal-agreement";

// Dynamic so the canonical URL uses the runtime APP_ORIGIN; one image serves every environment.
export const dynamic = "force-dynamic";
export const generateMetadata = () => legalMetadata(legalPaths.privacy, "Privacy notice | SaveTheDates", "How SaveTheDates collects, uses and protects information about couples and their guests, and your rights.");

export default function PrivacyPage() {
  return <PrivacyNotice />;
}

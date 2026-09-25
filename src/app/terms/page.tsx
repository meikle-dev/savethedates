import { legalMetadata, TermsOfService } from "@/features/marketing/legal";
import { legalPaths } from "@/features/marketing/legal-agreement";

// Dynamic so the canonical URL uses the runtime APP_ORIGIN; one image serves every environment.
export const dynamic = "force-dynamic";
export const generateMetadata = () => legalMetadata(legalPaths.terms, "Terms of service | SaveTheDates", "The terms for creating a SaveTheDates account and buying a wedding site.");

export default function TermsPage() {
  return <TermsOfService />;
}

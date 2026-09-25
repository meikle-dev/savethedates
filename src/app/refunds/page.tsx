import { legalMetadata, RefundPolicy } from "@/features/marketing/legal";
import { legalPaths } from "@/features/marketing/legal-agreement";

// Dynamic so the canonical URL uses the runtime APP_ORIGIN; one image serves every environment.
export const dynamic = "force-dynamic";
export const generateMetadata = () => legalMetadata(legalPaths.refunds, "Refund policy | SaveTheDates", "When you can get a refund for your SaveTheDates wedding site, and what happens to your site.");

export default function RefundsPage() {
  return <RefundPolicy />;
}

import type { MetadataRoute } from "next";
import { marketingOrigin } from "@/features/marketing/metadata";
import { isStaging } from "@/lib/staging-access";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  // Staging is password-protected and noindex too; this keeps crawlers out if that protection is ever lifted.
  if (isStaging()) return { rules: { userAgent: "*", disallow: "/" } };
  // Allow page crawling so robots can discover the default noindex directives.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }, sitemap: `${marketingOrigin()}/sitemap.xml` };
}

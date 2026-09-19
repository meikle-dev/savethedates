import type { MetadataRoute } from "next";
import { marketingOrigin } from "@/features/marketing/metadata";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  // Allow page crawling so robots can discover the default noindex directives.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }, sitemap: `${marketingOrigin()}/sitemap.xml` };
}

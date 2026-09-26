import type { MetadataRoute } from "next";
import { digitalSaveTheDatePath, marketingOrigin, whatWeOfferPath } from "@/features/marketing/metadata";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: marketingOrigin(), priority: 1 }, { url: `${marketingOrigin()}${digitalSaveTheDatePath}`, priority: 0.8 }, { url: `${marketingOrigin()}${whatWeOfferPath}`, priority: 0.9 }]; }

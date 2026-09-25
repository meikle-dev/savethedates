import type { MetadataRoute } from "next";
import { digitalSaveTheDatePath, marketingOrigin } from "@/features/marketing/metadata";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: marketingOrigin(), priority: 1 }, { url: `${marketingOrigin()}${digitalSaveTheDatePath}`, priority: 0.8 }]; }

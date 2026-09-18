import { z } from "zod";

export const reservedSlugs = new Set(["account", "auth", "dashboard", "api", "media", "preview", "preview-photo", "demo", "demo-no-photo", "demo-long-names", "pricing", "features", "guides", "examples", "privacy", "terms", "support", "robots", "sitemap", "favicon"]);
export const slugSchema = z.string().trim().toLowerCase().min(3).max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letters, numbers and single hyphens.")
  .refine((value) => !reservedSlugs.has(value), "That URL is reserved. Please choose another.");

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  allowedDevOrigins: ["127.0.0.1"],
  // Only the fictional theme images are optimised; other photos use `unoptimized`. This also bounds what the optimiser
  // can fetch, matching the images staging serves without its password (src/lib/staging-access.ts).
  images: { localPatterns: [{ pathname: "/media/themes/**", search: "" }] },
  // Source maps carry debug IDs so Sentry can resolve stack traces. The Docker build moves them out of the
  // image and strips their URL comments (scripts/extract-sourcemaps.mjs); CI uploads them to Sentry.
  productionBrowserSourceMaps: true,
  turbopack: { debugIds: true },
};

export default nextConfig;

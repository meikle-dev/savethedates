import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  allowedDevOrigins: ["127.0.0.1"],
  // Source maps carry debug IDs so Sentry can resolve stack traces. The Docker build moves them out of the
  // image and strips their URL comments (scripts/extract-sourcemaps.mjs); CI uploads them to Sentry.
  productionBrowserSourceMaps: true,
  turbopack: { debugIds: true },
};

export default nextConfig;

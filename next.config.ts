import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

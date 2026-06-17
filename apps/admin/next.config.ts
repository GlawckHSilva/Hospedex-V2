import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  },
  reactStrictMode: true,
  transpilePackages: [
    "@hospedex/feature-flags",
    "@hospedex/types",
    "@hospedex/ui"
  ]
};

export default nextConfig;

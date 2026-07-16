import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "soplwzxmbgkybmzthzaq.supabase.co",
        pathname: "/storage/v1/object/public/**",
        protocol: "https"
      }
    ]
  },
  reactStrictMode: true,
  transpilePackages: [
    "@hospedex/feature-flags",
    "@hospedex/types",
    "@hospedex/ui"
  ]
};

export default nextConfig;

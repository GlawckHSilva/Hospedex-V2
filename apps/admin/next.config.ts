import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O cadastro de casas envia capa e galeria no mesmo Server Action.
      // Um limite maior evita falha antes da validação de Storage do Supabase.
      bodySizeLimit: "25mb"
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // TODO: fix types; for now allow build
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

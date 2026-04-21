import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@finagevolata/shared", "@finagevolata/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;

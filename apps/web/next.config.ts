import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@finagevolata/shared", "@finagevolata/db"],
};

export default nextConfig;

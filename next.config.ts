import type { NextConfig } from "next";

const isApkBuild = process.env.NEXT_PUBLIC_APK_BUILD === "1";

const baseConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
    unoptimized: true,
  },
};

const nextConfig: NextConfig = isApkBuild
  ? {
      ...baseConfig,
      output: "export",
      trailingSlash: true,
    }
  : {
      ...baseConfig,
      turbopack: { root: import.meta.dirname },
    };

export default nextConfig;

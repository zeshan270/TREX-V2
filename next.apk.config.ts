import type { NextConfig } from "next";

// ── APK Build Config ────────────────────────────────────────
// Used only for `npm run apk:build` — generates static `out/`
// folder that Capacitor bundles into the Android APK.
// Vercel deployments use the normal `next.config.ts` (no changes there).

const nextConfig: NextConfig = {
  output: "export",          // Generate static HTML/JS/CSS in out/
  trailingSlash: true,       // out/movies/index.html etc. for clean routing
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
    unoptimized: true,       // Required for static export
  },
  // Env flag so components can detect APK build
  env: {
    NEXT_PUBLIC_APK_BUILD: "1",
  },
};

export default nextConfig;

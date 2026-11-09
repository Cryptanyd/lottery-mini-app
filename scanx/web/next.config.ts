import type { NextConfig } from "next";

// CORS headers for /api/* are set inside the route handlers (src/lib/server/api.ts)
// so the browser extension can call the public API.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app lives in a sub-folder of a repo that has its own lockfile.
  outputFileTracingRoot: __dirname,
  images: { unoptimized: true },
};

export default nextConfig;

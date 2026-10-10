import type { NextConfig } from "next";

/**
 * This repo hosts two apps: Field Atlas (`/`) and Voltline (`/solar`, `/dashboard`).
 * The Voltline Vercel project sets VOLTLINE_STANDALONE=1 so its home page is the Voltline
 * marketing site and the Field Atlas API routes are not reachable there. Any project without
 * the variable (e.g. the Field Atlas deployment) behaves exactly as before.
 */
const voltlineStandalone = process.env.VOLTLINE_STANDALONE === "1";

const nextConfig: NextConfig = {
  async redirects() {
    if (!voltlineStandalone) return [];
    return [
      { source: "/", destination: "/solar", permanent: false },
      // Field Atlas' own APIs have no business on the Voltline deployment. Voltline's APIs
      // (/api/billing/*, /api/blob/*) must stay reachable.
      { source: "/api/atlas/:path*", destination: "/solar", permanent: false },
      { source: "/api/entitlement/:path*", destination: "/solar", permanent: false },
      { source: "/api/stripe/:path*", destination: "/solar", permanent: false },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

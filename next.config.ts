import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Dev-only: allow Cloudflare Quick Tunnel origins (https://<id>.trycloudflare.com)
  // to request dev-server assets/endpoints. Ignored in production builds.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Removed auth routes (Toolora is login-free) redirect to the free tool catalog.
  async redirects() {
    return [
      { source: "/login", destination: "/tools", permanent: true },
      { source: "/signup", destination: "/tools", permanent: true },
      { source: "/account", destination: "/tools", permanent: true },
    ];
  },
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

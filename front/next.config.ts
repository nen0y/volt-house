import type { NextConfig } from "next";

// The Next.js server proxies API, uploads and the admin panel to the backend,
// so the browser only ever talks to the frontend origin (one public port, no CORS).
// In Docker this points at the internal `back` service; locally it defaults to :4000.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
      // Map /admin straight to the backend's index.html to avoid a trailing-slash
      // redirect loop between Next (strips "/") and Express static (adds "/").
      { source: "/admin", destination: `${BACKEND_URL}/admin/index.html` },
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

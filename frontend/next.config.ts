import type { NextConfig } from "next";
import path from "node:path";

const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8081";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

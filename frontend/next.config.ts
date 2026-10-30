import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          "https://backend-nutrimeals.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;

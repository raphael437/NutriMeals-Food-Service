import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, 
  },
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Or 'uploadthing.com', etc.
      },
    ],
  },
};
// frontend/next.config.js
module.exports = {
  allowedDevOrigins: [
    'organisation-racks-dialog-pda.trycloudflare.com',
  ],
};
export default nextConfig;

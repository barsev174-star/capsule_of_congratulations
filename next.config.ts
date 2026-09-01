import type { NextConfig } from "next";
import { appSecurityHeaders } from "./src/lib/security/headers";

const extraDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.31.225", ...extraDevOrigins],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: appSecurityHeaders
      },
      {
        source: "/assets/share-og/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb"
    }
  }
};

export default nextConfig;

import type { NextConfig } from "next";

const extraDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.31.225", ...extraDevOrigins],
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb"
    }
  }
};

export default nextConfig;

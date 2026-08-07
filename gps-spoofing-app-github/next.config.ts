import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow any device on local Wi-Fi to connect */
  allowedDevOrigins: ["*"],
};

export default nextConfig;

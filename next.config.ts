import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tbhofdmfzwibysnnssnx.supabase.co',
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { readFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tbhofdmfzwibysnnssnx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;

import type { NextConfig } from 'next'
import { readFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
);

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number]

function buildStorageRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '54321',
      pathname: '/storage/v1/object/public/**'
    }
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      const protocol = parsed.protocol.replace(':', '')
      if (protocol === 'http' || protocol === 'https') {
        const pattern: RemotePattern = {
          protocol,
          hostname: parsed.hostname,
          pathname: '/storage/v1/object/public/**'
        }
        if (parsed.port) {
          pattern.port = parsed.port
        }
        patterns.push(pattern)
      }
    } catch {
      // Ignore malformed Supabase URL and keep fallback pattern.
    }
  }

  const seen = new Set<string>()
  return patterns.filter((pattern) => {
    const key = `${pattern.protocol}//${pattern.hostname}:${pattern.port || ''}${pattern.pathname}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildStorageRemotePatterns()
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;

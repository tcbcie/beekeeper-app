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
  allowedDevOrigins: ['192.168.100.50'],
  // @react-pdf/renderer ships native-ish internals (yoga wasm, fonts) that
  // break when bundled — keep it external to the server build.
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    remotePatterns: buildStorageRemotePatterns()
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async headers() {
    // Hosts allowed to iframe /embed/* pages.
    // CSP frame-ancestors is the modern replacement for X-Frame-Options ALLOW-FROM
    // and is what gates the TCBC WordPress embed.
    // See: docs/features/tcbc-wordpress-research-widget.md
    const embedFrameAncestors = "frame-ancestors 'self' https://www.tcbc.ie https://tcbc.ie"

    return [
      {
        // Catch-all security headers for everything except /embed/*
        // (path-to-regexp negative lookahead — embed routes get their own block below).
        source: '/:path((?!embed/|embed$).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Iframe-embeddable routes — keep the other hardening headers but
        // swap X-Frame-Options DENY for a CSP that whitelists allowed parent origins.
        source: '/embed/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: embedFrameAncestors },
        ],
      },
    ];
  },
};

export default nextConfig;

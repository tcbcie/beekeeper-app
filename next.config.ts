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

// Content Security Policy for the app (everything except /embed/*). Shipped as Report-Only
// first: browsers block nothing and report would-be violations to /api/csp-report (Vercel logs).
// Switch the header key to 'Content-Security-Policy' once the reports are clean.
// 'unsafe-inline' scripts: Next.js hydration and the theme script need it (nonces would be the
// stricter route). img-src https: covers news images, map tiles and Supabase Storage.
function buildContentSecurityPolicy(): string {
  const connectSrc = [
    "'self'",
    'https://api.mapbox.com',
    'https://events.mapbox.com',
    'https://*.tiles.mapbox.com',
    'https://api.open-meteo.com',
    'https://archive-api.open-meteo.com',
    'https://nominatim.openstreetmap.org',
    'https://api.postcodes.io',
    'https://en.wikipedia.org',
  ]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      const { origin, host, protocol } = new URL(supabaseUrl)
      connectSrc.push(origin, `${protocol === 'https:' ? 'wss' : 'ws'}://${host}`)
    } catch {
      // Malformed URL: leave Supabase out; the reports will show it.
    }
  }
  // Next.js dev mode (fast refresh) needs eval; production does not.
  const scriptSrc = process.env.NODE_ENV === 'development'
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'"

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "worker-src 'self' blob:",
    'child-src blob:',
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
    'report-uri /api/csp-report',
  ].join('; ')
}

// Only this site may use the camera (photos), microphone (voice notes) and location (apiaries).
const permissionsPolicy = 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), browsing-topics=()'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.50'],
  // Don't announce the framework in an X-Powered-By header.
  poweredByHeader: false,
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
          { key: 'Permissions-Policy', value: permissionsPolicy },
          { key: 'Content-Security-Policy-Report-Only', value: buildContentSecurityPolicy() },
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
          { key: 'Permissions-Policy', value: permissionsPolicy },
          { key: 'Content-Security-Policy', value: embedFrameAncestors },
        ],
      },
    ];
  },
};

export default nextConfig;

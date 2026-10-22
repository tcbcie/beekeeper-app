# Security Batch 9: Browser Hardening

**Status:** Step 1 done on 17/10/2026 (report-only). Step 2 done on 22/10/2026: the CSP is **enforced** (`Content-Security-Policy`), see `tasks/security-batch22-csp-todo.html`. The report-only logs had expired (Vercel Hobby keeps 1 hour), so the allowlist was checked against every external address in the code instead; nothing was missing.
**Checklist:** `tasks/security-batch9-todo.html`
**Findings:** CLI-03 to CLI-08 (Low)

## Security headers (`next.config.ts`)

| Header | Routes | Value |
|---|---|---|
| `Content-Security-Policy-Report-Only` | all except `/embed/*` | `buildContentSecurityPolicy()`, see below |
| `Permissions-Policy` | all | `camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), browsing-topics=()` |
| `Content-Security-Policy` | `/embed/*` | `frame-ancestors 'self' https://www.tcbc.ie https://tcbc.ie` (unchanged) |
| `X-Content-Type-Options`, `X-Frame-Options` (not on embed), `Referrer-Policy`, `Strict-Transport-Security` | as before | unchanged |

`poweredByHeader: false` removes `X-Powered-By: Next.js`.

### The CSP

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self' data:;
connect-src 'self' <Supabase origin> <wss Supabase> https://api.mapbox.com https://events.mapbox.com
  https://*.tiles.mapbox.com https://api.open-meteo.com https://archive-api.open-meteo.com
  https://nominatim.openstreetmap.org https://api.postcodes.io https://en.wikipedia.org;
worker-src 'self' blob:; child-src blob:; media-src 'self' blob:; manifest-src 'self';
frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
upgrade-insecure-requests; report-uri /api/csp-report
```

- The Supabase origins come from `NEXT_PUBLIC_SUPABASE_URL`. In dev mode `script-src` also has `'unsafe-eval'`, which fast refresh needs.
- `'unsafe-inline'` for scripts is needed by Next.js hydration and the theme script. Dropping it would need per-request nonces through middleware.
- These are only reached from the server or by full-page navigation, so they need no CSP entry: Stripe, BEEP, Wolf, Resend, Google Geocoding and Google Maps links. Vercel Analytics and Speed Insights are same-origin.
- **When adding a new browser-side external call or embed**, add its origin here, or the CSP will block it.

### Step 2: enforcing

1. After a few days of normal use, filter the Vercel runtime logs for `[CSP]`. Each line has the directive, the blocked origin, the page and the source file (no query strings).
2. Add any legitimate origin to `buildContentSecurityPolicy()`.
3. Change the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Keep `report-uri` so future breakages show up.

## `/api/csp-report`

- Public, because browsers post without auth.
- Rejects bodies over 16 KB.
- Logs only `effective-directive`, `blocked-uri`, `document-uri`, `source-file` and `line-number`, with each field capped at 300 characters and query strings and fragments removed.
- Always returns 204 and echoes nothing back.

## Other fixes

- **CLI-05 (`src/app/login/page.tsx`):** `?redirect=` is parsed with `new URL(raw, 'https://hivecraic.invalid')`, and only a same-origin result's path, query and fragment are used; anything else goes to `/dashboard`. This covers tab, newline and backslash tricks that a character check misses.
- **CLI-07 (`src/components/hive/HiveQRCode.tsx`):** the tag code is HTML-escaped in the print window.
- **CLI-08 (`public/embed/tcbc-research-widget.js`):** Chart.js 4.4.1 is loaded as the published `dist/chart.umd.js` with SRI and `crossorigin="anonymous"`. The hash was computed from the npm tarball, and the jsDelivr copy is byte-identical. See `tcbc-wordpress-research-widget.md`.
- **CLI-06** was already closed by batch 6 (DB-04).

## Owner action (optional)

The bare `hivecraic.com` only redirects to `www`, and Vercel sends its HSTS header without `includeSubDomains; preload`. Set it in Vercel → Domains if you ever submit the site to the HSTS preload list.

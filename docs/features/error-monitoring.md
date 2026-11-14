# Error monitoring

**Status:** built 13 November 2026 (batch A capture, batch B privacy). Not live until the owner adds the Sentry settings in Vercel. Plan: `error-monitoring-plan.md`.

## What it does

When HiveCraic fails on a beekeeper's phone or on the server, a report goes to Sentry (EU region) and the owner gets an email. Errors only: no performance tracing, no session recording.

## What is reported

| Source | How |
|---|---|
| Any uncaught error or unhandled rejection in the browser | Automatic (`src/instrumentation-client.ts`) |
| Any error a server route throws without catching | Automatic (`onRequestError` in `src/instrumentation.ts`) |
| The dashboard error screen and the whole-app error page | `reportError('error-boundary' / 'global-error')` |
| An inspection the server refused (stuck on the phone) | `reportError('outbox-refused')` in `inspection-outbox.ts` |
| An unexpected failure while sending, or failing to keep an inspection on the device | `'outbox-send'`, `'outbox-store'` |
| Stripe webhook: event not recorded, activation failed, unexpected failure | `'stripe-webhook'` |
| Nightly storage clean-up: queue read, reference check or removal failed | `'storage-cleanup'` |
| Invoice email: PDF, send or unexpected failure | `'invoice-email'` |

The other handled errors in the app (about 650 `console.error` places) are not reported. They already show the user a message.

## Rules for new code

- **Report through `reportError(where, error)`** in `src/lib/report-error.ts`. Never import `@sentry/nextjs` in a screen, hook or route.
- `where` is a short fixed label. **Never pass user content**: no record text, email addresses, names or request bodies. Pass the error object, or a message you wrote yourself.
- Supabase errors are plain objects; `reportError` handles them and tags the error code.
- Report only faults someone must act on. A handled error that the user can simply retry is not one.

## What is never sent

Set in `src/lib/sentry-options.ts` and `src/instrumentation-client.ts`:

- No IP address, cookies, request headers or bodies, link query strings, database query data or local variables (`dataCollection`, all off).
- Identity is the account id only (`setMonitoringUser`, called from the dashboard layout).
- Nothing at all while an admin is impersonating a user.
- Breadcrumbs: only screen changes and taps, with anything after `?` or `#` removed. No console output, no requests.
- "No signal" errors (failed to fetch, load failed, timeouts, aborts) are ignored.
- Reports are sent only from production builds, and only when `NEXT_PUBLIC_SENTRY_DSN` is set.

## Settings

| Name | Where | What |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel (all environments) | Public address reports are sent to. Must be an EU (`ingest.de.sentry.io`) address: the security policy in `next.config.ts` allows only `https://*.ingest.de.sentry.io`. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Vercel | Build only: upload source maps so reports show readable code. Without the token the build still runs and nothing is uploaded. |

### The Sentry project (created 14 November 2026)

| Item | Value |
|---|---|
| Organisation | `tcbcie` (TCBC.ie), EU region (`de.sentry.io`) |
| Project | `hivecraic`, platform Next.js, team `tcbcie` |
| Dashboard | https://tcbcie.sentry.io/issues/?project=hivecraic |
| `SENTRY_ORG` / `SENTRY_PROJECT` | `tcbcie` / `hivecraic` |

Project privacy settings, switched on at creation: **Prevent Storing of IP Addresses**, **Data Scrubber** and **default scrubbers**. Sentry would otherwise record the sender's address on its side.

The public address (DSN) is in `.env.local` and must be added to Vercel. It is not secret, but it is kept out of the repository with the other settings.

Sentry's setup guide recommends tracing and session recording as well. They are deliberately off (owner decision, errors only).

## Verification (14 November 2026)

A temporary admin-only route (`POST /api/sentry-test-error`, since removed) and a console test proved the whole chain:

| Test | Issue | Result |
|---|---|---|
| Server error | HIVECRAIC-1, HIVECRAIC-2 | Arrived within seconds, tagged with the release (commit), `production` and app version. No headers, cookies, body or IP address. |
| Browser error | HIVECRAIC-3 | Arrived through the security policy with the account id only, no IP address. Breadcrumbs held only a page change and a tap. |

Findings:

- **Browser frames in shared code files were unreadable.** By default Sentry uploads source maps only for page-specific files (`static/chunks/app/**`), not shared files such as `9079-*.js`, which hold much of the app's own code. Fixed with `widenClientFileUpload: true` (slightly longer builds).
- **Known limit: server route files.** Server reports show readable Next.js and library frames and name the route (`POST /api/...`), but the line inside our own route file maps to Next.js's generated route template instead. Switching off Sentry's route wrapping (`autoInstrumentAppDirectory: false`) did not change this and was reverted. Use the route name, the message and the `where` tag from `reportError` to find the fault. Finding the cause needs a local production build to inspect the server source maps.
- The location on server reports (United States, Ashburn) is the Vercel server's. The location on browser reports (e.g. Dublin) is worked out by Sentry from the sender's address when the report arrives; the address itself is not stored.

To repeat the browser test, paste this into the browser console on the live site:
`setTimeout(() => { throw new Error('Sentry browser test ' + new Date().toISOString()) })`

## Limits

- An error raised while offline is lost if the app is closed before signal returns. A refused inspection is detected when signal is back, so it is reported.
- `/embed/*` pages have their own security policy and do not report.
- Reports are tagged with the app version and the deployment (production or preview).

# Error monitoring — plan

**Status:** approved and built 13 November 2026 (see `error-monitoring.md`) · **Date:** 13 November 2026 · **Decision:** D2 in the technology stack review (add error monitoring)

## Why

When HiveCraic crashes on a beekeeper's phone, or an inspection saved without signal is later refused by the server, nobody is told. Today:

- The one error screen (`ErrorBoundary`, dashboard only) and the whole-app error page (`global-error.tsx`) show a message and report nothing.
- A refused inspection shows a toast on that phone and stays in the on-device outbox. Nothing leaves the device.
- Server routes log to Vercel, where logs are kept briefly and nobody is alerted.
- There are no window-level error listeners and no logging helper.

Most users will not report a fault. The first sign is a lost inspection or a lost customer.

## What you get

- An email (and a dashboard) when a new kind of error appears, with the page, the app version, the phone and browser, and a readable stack trace.
- A count of how many users each error affects.
- Specific alerts for the failures that cost data: a refused inspection, a failed on-device save, a failed Stripe webhook, a failed nightly clean-up.

## Service

**Sentry**, through its Next.js library (`@sentry/nextjs`), with data kept in the **EU region**. It is the standard choice for Next.js on Vercel. I have not checked the current free-tier limits or price; you will see them when creating the account. Errors only: no performance tracing and no session recording, which keeps cost, download size and privacy exposure down.

## Design (kept as small as possible)

### 1. What is captured automatically
- Any uncaught error or unhandled promise rejection in the browser.
- Any uncaught error in a server route (through Next.js's own error hook in a new `src/instrumentation.ts`).

### 2. What is reported on purpose
One tiny helper, `src/lib/report-error.ts` (`reportError(where, error)`), so no screen imports Sentry directly. Called from:

| Place | Why |
|---|---|
| `ErrorBoundary.componentDidCatch`, `global-error.tsx` | The crashes users actually see |
| `inspection-outbox.ts` `refuse()` | An inspection the server refused: the data is stuck on the phone |
| `inspection-outbox.ts` unexpected failure (retries for ever, silently) and failed on-device save | Closest things to data loss |
| `stripe/webhook`, `cron/storage-cleanup`, `crm/invoice-email` catch blocks | Paid-for and unattended work |

The other ~650 `console.error` places are left alone. They are handled errors that already show the user a message; reporting them all would bury the real faults. More can be added one at a time when a need shows.

### 3. What is deliberately not sent
- No email address or name. Only the account id, so errors can be counted per user.
- Nothing while an admin is impersonating a user.
- No page address query strings (invitation, password-reset and sign-in links carry tokens).
- No console history (it can contain database error details), no request bodies.
- "No signal" errors (`Failed to fetch`, `Load failed`) are ignored, using the same test the outbox already uses, so a day at an out-apiary does not raise hundreds of alerts.

### 4. Security policy and build
- Sentry's EU address is added to the allowed list in `next.config.ts` (the policy is enforced; without this every report is silently blocked).
- `next.config.ts` is wrapped so readable stack traces are uploaded at build time. That needs a build-only secret in Vercel. If the secret is missing the build still passes, with unreadable traces.
- Tagged with the build id (commit) and app version that already exist.

### 5. Privacy policy
The privacy page says data is not shared with third parties and names only Stripe. It needs a short addition naming the error-monitoring service and what it receives (technical error details and an account id, no beekeeping records), with the "Last updated" date. The same page does not mention Supabase, Vercel, OpenAI or Mapbox either; I suggest listing all of them while it is open. **You should read the wording before it goes live.**

## Batches

**Batch A — capture**
- [ ] You create the Sentry account and project (EU region) and give me the public address (DSN); you add the build secret in Vercel
- [ ] Add `@sentry/nextjs`; `src/instrumentation-client.ts`, `src/instrumentation.ts`; wrap `next.config.ts`; add the host to the security policy
- [ ] `src/lib/report-error.ts`; calls in the error screen, the whole-app error page, the outbox and the three server routes
- [ ] Account id tagging in the dashboard layout; skip while impersonating
- [ ] `.env.example` updated
- [ ] You run the tests and check the Vercel build; then trigger one test error and confirm it arrives

**Batch B — privacy and documents**
- [ ] Privacy page wording (for your approval) and the About page's third-party list
- [ ] `docs/features/error-monitoring.md`, security-policy memory note

## Risks

- **Download size.** The library adds to the first load. I estimate tens of kilobytes compressed with tracing and recording off, but I have not measured it. It is cached after the first visit following each release. You can check with a before/after phone load.
- **Security policy.** The address is region-specific and must match the DSN exactly. A wrong one fails silently; the test error in Batch A proves it.
- **Next.js 16 upgrade (batch 4 of the stack review).** Sentry wraps the build configuration, so it is one more thing to recheck in that upgrade. Suggest doing error monitoring first so the upgrade is watched by it.
- **Errors while offline are lost** if the phone is closed before signal returns. The important offline case, a refused inspection, is detected when signal is back, so it is reported.
- **Library version.** I will check Sentry's current Next.js 15.5 instructions at build time and not work from memory.

## Decisions for the owner

1. Sentry in the EU region, errors only: agreed?
2. Privacy page: list all current third-party services while adding this one, or add only the new one?

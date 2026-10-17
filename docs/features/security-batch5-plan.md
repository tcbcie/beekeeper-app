# Security Batch 5: Next.js Upgrade, Dependency Clean-Up, Service Worker

**Status:** Done 17/10/2026. The owner tested the build and the app; committed and pushed to `main`.
**Checklist:** `tasks/security-batch5-todo.html`
**Findings:** SUP-12 (High), SUP-11 (Low), CLI-01 (Medium), CLI-02 (Medium)

## A. Next.js 15.5.7 → 15.5.28

- `next` is now `^15.5.28` and `eslint-config-next` is `15.5.28`. It's the same minor version, so no code changes were needed.
- 15.5.28 (14/10/2026) is a security release:
  - **Critical:** remote code execution in the image optimiser with SVG files.
  - **High:** denial of service in the App Router through Server Actions.
- Neither applied to this app: `dangerouslyAllowSVG` is off, Vercel runs the optimiser, and the app has no Server Actions.
- The releases in between fixed Medium cache-poisoning and metadata information-disclosure advisories, among others.
- Next.js 16 is a major upgrade and needs a separate plan.

## B. Dependencies

- Removed the unused `ai` and the deprecated `@supabase/auth-helpers-nextjs`; nothing imported either.
- Moved `@google/generative-ai` to `devDependencies`, because only `scripts/ingest` uses it.
- Ran `npm audit fix` without `--force`, so packages only moved within their allowed version ranges. `sharp` went to 0.35.5, which Next.js 15.5.28 lists as supported.
- Runtime audit went from 20 findings (1 critical, 9 high) to 5 (0 critical, 2 high). The remainder:

| Remaining | Why |
|---|---|
| `next` (moderate), bundled `postcss` 8.4.31 (high) | Only fixed in Next.js 16. The bundled `postcss` only processes our own CSS at build time. |
| `brace-expansion`, `uuid`, `exceljs` | The fix is a breaking downgrade to `exceljs` 3.x. Not reachable: `archiver` uses fixed glob patterns, and the `uuid` buffer path isn't used. |

## C. Service worker and sign-out

**Worker (`public/service-worker.js`):**
- `/api/*` responses are never cached. Before, the catch-all cached them by URL, so the next person on a shared device could read them in DevTools, or be served them offline.
- When the updated worker activates, it deletes any `/api/*` entries older versions cached. No version bump is needed: the file's contents changed, so browsers install the update and the existing update prompt activates it.
- The new `CLEAR_USER_DATA` message deletes everything except `/_next/static/*` and the offline shell (`OFFLINE_URLS`). That includes third-party lookups such as weather and geocoding, which carry apiary coordinates. The Mapbox tile cache is kept, for offline field maps.

**Sign-out:**
- `src/lib/sign-out-cleanup.ts` provides `clearLocalUserData()`. It removes the admin's stored impersonation session (`hivecraic_impersonation`, whose refresh token was still live) and sends `CLEAR_USER_DATA` to the registration's active worker.
- It's called on every `SIGNED_OUT` in `AuthContext`, which covers the navbar, deactivation, account deletion and impersonation exit. The reset-password page calls it directly, because it sits outside the dashboard's `AuthProvider`.
- Exiting impersonation still works, because the banner holds the admin session in memory before it signs out.

## Verification

- No type errors in `src/`, and ESLint is clean on all of `src`.
- The worker parses, and its URL rules were checked against sample URLs.
- `qa-engineer` review: no Critical or High issues, and the two smaller findings are fixed.
- The owner tested the production build and the app (login, dashboard, hive, images, community map, `/trace`, sign-out, impersonation exit).

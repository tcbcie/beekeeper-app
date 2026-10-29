# Batch 45: API Routes

**Status:** Implemented 29/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch45-todo.html`
**Database:** one data fix (a single knowledge source's chunk count) and five e-mail functions redeployed. No table changes.

**Findings:**
- **Fixed:** C2-05 to C2-09, C2-11 to C2-14, C2-16, C2-17 and C2-30.
- **Re-confirmed fixed:** C2-31.

This is Phase 2 fix batch 32.

**Owner decisions:**
- Stream the complete export rather than remove it.
- Correct the one knowledge source's chunk count.

## A. Scales (`src/app/api/beep/data`, `src/app/api/wolf-waagen/data`)

- **C2-06/07, chart requests:** when a request has a `period` or custom dates, the route builds only the history and returns `{ history, period }`, straight after the token check. The summary block isn't run, and no caller of a period request read the summary.
  - BEEP: 15 calls on opening go down to 8, and 1 per period change.
  - Wolf chart: 9 calls go down to 1.
- **C2-05, Wolf's 24-hour figures:** one `wolfGetMeasurements(..., twoDaysAgo, now, 'hourly')` call replaces the daily previous-24h fetch. The series is split at `oneDayAgo`, and both figures use `calcWeightChange`. The old last-24h figure was `lastValues.yield_kg`, which is the change since the previous reading.
- **C2-08, custom dates:** `isIsoDate()` and `customRangeError(start, end, maxDays = 366)` are new in `src/lib/dublin-date.ts`. When `period === 'custom'`, both routes return 400 before any token or vendor work. Wolf custom ranges over 31 days use daily resolution.
- **C2-09, time limits:** Vercel's default is 300 s, so only `wolf-waagen/data` gets its own cap: `maxDuration = 90`, because its summary calls run one after another with retries on a 429. The complete export declares 300.
- **Browser:** scale IDs in request addresses use `encodeURIComponent` in five components.

## B. Calls that can hang (C2-12, C2-13)

- **BEEP, Wolf and the batch elevation lookup:** these pass `signal: AbortSignal.timeout(ms)`, which stays armed while the body is read. Before, a timer cleared when the headers arrived didn't cover the body.
- **GDD embed (`api/embed/gdd-archive`):** it races `fetch().then(r => r.ok ? r.json() : null)` against the timer. It keeps a race rather than a signal so Next.js still caches the reply.
- **Resend:** all 7 calls get `signal: AbortSignal.timeout(10_000)`, and the invoice e-mail with its PDF gets 20 s.
  - Five Supabase functions were redeployed: `task-event-reminders` (v16), `weekly-email-digest` (v18), `notify-admin-new-user` (v11), `send-team-invitation` (v17) and `send-rearing-group-invitation` (v11).
  - The reminders and the digest send one e-mail at a time, so a stuck send used to hold up everyone after it.

## C. Requests and clients

- **C2-14, malformed bodies:** `readJsonBody<T>(request)` and `MALFORMED_BODY` are new in `src/lib/server/api-auth.ts`. The helper returns null for a malformed or empty body, `null`, or an array. Eight call sites now return 400:
  - impersonate POST
  - knowledge base POST and PATCH
  - news POST and PATCH
  - update-user-role
  - Wolf connect
  - BEEP connect
- **C2-16, shared client:** `rag.ts` `getServerSupabase()`, `cron/storage-cleanup` and `stripe/webhook` use `getServiceSupabase()`. Those routes keep their own trust checks: the cron secret and the Stripe signature.

## D. Complete export (C2-11)

- **Why it never worked:** the knowledge base's embeddings make the complete export about 110 MB of SQL. Vercel refuses a reply over 4.5 MB sent in one piece, so the export could never work, and the admin log shows it had never been run since logging began.
- **How it is sent now:** the route builds the header as before, then returns a `ReadableStream`.
  - Its `pull()` reads from an async generator. The generator yields the header, then each group of 4 tables in table order (`exportTable` is unchanged), then `buildFooter()`.
  - `buildFooter()` is the old footer code, moved unchanged into a function, because it lists the table counts.
  - Each part is built only when the browser asks for the next, and `cancel()` stops the generator.
- **Failures part-way through:** the 200 has already been sent, so the file ends with `-- EXPORT FAILED`.
- **The browser (`ProfileExport.tsx`):** it refuses a file without `-- END OF EXPORT` ("The export was cut short") and waits up to 300 s.
- **Not confirmed:** Vercel's documents didn't confirm that streamed replies escape the 4.5 MB limit, so the owner is asked to run the export once.

## E. Knowledge base (C2-17)

- **Database:** it already deletes a source's chunks with it, and today there are 0 orphans.
- **Uploads:** the chunk count update after an upload is checked and logged.
- **Single-chunk delete:** it uses `.select('source_id')` to find the source, then recounts that source's chunks.
- **News articles:** if deleting the knowledge source fails, the route returns 500 and keeps the article, in both the delete path and the remove-from-knowledge-base path.
- **Data fix:** one source was corrected from 0 to 19 chunks; it was added on 30/12/2025 by the local upload script. The script already throws on its count error.

## F. E-mail links (C2-30)

- `task-event-reminders` and `weekly-email-digest` get `const APP_URL = 'https://www.hivecraic.com'`, as the invitation functions already have, and their links go to `/dashboard/profile` and `/dashboard/batches`.

## Rules

- **API routes:**
  - Read request bodies with `readJsonBody()`.
  - Check dates sent to a route with `customRangeError()` before doing any work.
- **Outside calls:**
  - Use `AbortSignal.timeout()`, not a timer cleared once the headers arrive.
  - Every Resend call has a time limit.
- **Shared client:** server code uses `getServiceSupabase()` and never builds another secret-key client.
- **Large downloads:** stream them, and have the browser check for the closing line.

# Batch 43: Settings and Admin

**Status:** Implemented 25/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch43-todo.html`
**Database:** no change.

**Findings:**
- **Fixed:** C9a-05, C9a-07, C9a-08, C9a-10, C9a-12 to C9a-17, C9a-25 and C9a-26.
- **Closed:** C9a-09 (already fixed in batch 25) and C9a-24 (left as it is).
- **Re-confirmed fixed:** C9a-01 and C9a-02.

This is Phase 2 fix batch 30.

## A. Profile

- **C9a-08:** `updatePreference` on the profile page:
  - **After a successful write:** it updates `userProfile`, the saved baseline that Cancel and the rejected-input resets read from. Before, Cancel rebuilt the form from the page-load profile and flipped saved toggles back off.
  - **Out-of-order saves:** a per-key request counter (`preferenceRequestRef`) means a failed save rolls back only if it is still the latest change for that setting.
- **C9a-07:**
  - **The caches:** `useHasActiveSubscription`, `useCrmEnabled`, `useLogbookEnabled` and `useYardMapEnabled` no longer cache a failure. They fail closed and retry on the next call.
  - **Generation counter:** a module-level `generation` is bumped on sign-in and sign-out. A request that started before the change can't write the cache or clear the next account's in-flight request.
  - **After a renewal:** `clearSubscriptionCache()` (new) runs after a renewal, together with the page's own status fetch. That fetch now goes through `resolveSubscriptionStatus()` (QA fix).
- **C9a-05:** `toast.success(data?.message || …)` on the admin account toggle.

## B. Admin

- **C9a-10:** `TicketManagement` loads every ticket (15 today) and filters on screen (`visibleTickets`), so the stats count every status.
- **C9a-12 to C9a-14:**
  - **Now report on failure:** news publish and unpublish, the association list for codes, the user list for the transfer dialog, and the expired-session paths in the knowledge base, news and transfer.
  - **Real error messages:** about a dozen `error instanceof Error` catches now read `.message`, because Supabase errors are plain objects.
  - **Duplicate codes:** the duplicate registration code check also matches `23505`.
- **C9a-15:** the knowledge base and news lists request `limit=1000`, and warn when the API's `total` is larger.
- **C9a-16:**
  - **Where the 3 MB limit is set:** the screen text, a client check before the file is base64-encoded (`MAX_PDF_BYTES`), and both route checks (encoded length about 4.2 MB, decoded 3 MB). Base64 in a JSON body must stay under the hosting's 4.5 MB request limit.
  - **Errors:** the response is parsed with `.catch(() => ({}))`, and a 413 gets its own message.
  - **If larger PDFs are needed:** a private bucket with a path-only API call.
- **C9a-17:** the About page news search uses an `AbortController` and a `cancelled` flag, so a superseded request can't set results or stop the spinner.

## C. Sizes: C9a-25, C9a-26

About 96 changes in 12 files: settings managers, admin managers, profile, support and subscription history.

- **Fields:** `text-base` and `min-h-12`.
  - The association search uses `fj-control-inline !pl-9`, because `.fj-control`'s padding overrode `pl-8` and the text ran under the icon.
  - The knowledge base search's clear button is now a 48px area at the right edge.
- **Checkboxes:** 20px, inside `min-h-12` labels.
- **Narrow buttons and links:** `min-w-12`, or a 48×48 area for icon-only ones, with `aria-label`s on the icon links.
- **Shared checkbox:** `.fj-checkbox` in `globals.css` goes from 16px to 20px app-wide, as the owner approved. This also enlarges the apiaries, tasks and jar-label checkboxes.
- **Spelling:** "National Organisation Memberships".

## Rules

- Module caches of per-user data don't cache failures, and drop late answers with a generation counter that is bumped on auth changes.
- Clear the subscription cache after anything that changes the subscription.
- Optimistic saves update the saved baseline, and roll back only the latest request.
- Base64 uploads in JSON stay under 3 MB; larger files go to Storage first.

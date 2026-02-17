# P2 QA Audit Fixes — Todo

## Fixes
- [x] Fix 1: QUAL-7 — Add eslint-disable justification comment (RenewSubscriptionModal.tsx)
- [x] Fix 2: PERF-13 — Move priorityOrder to module-level constant (UpcomingEvents.tsx)
- [x] Fix 3: SEC-11 — Max query length for news search (route.ts)
- [x] Fix 4: STATE-9 — Prevent duplicate service worker message listener (push-notifications.ts)
- [x] Fix 5: SEC-10 — Validate URL protocol in chat links (ChatMessage.tsx)
- [x] Fix 6: SEC-12 — SSRF protection for knowledge base URL fetch (knowledge-base/route.ts)
- [x] Fix 7: STATE-7 — Add mountedRef to useDashboardStats (useDashboardStats.ts)
- [x] Fix 8: STATE-8 — Add mountedRef to useImageUpload (useImageUpload.ts)
- [x] Fix 9: PERF-12 — Skip re-fetching dropdown options after first load (useRecordsData.ts)
- [x] Fix 10: PERF-11 — Single-pass inspection averages calculation (useHiveDetail.ts)
- [x] Fix 11: ERR-12 — Magic bytes validation for image uploads (useImageUpload.ts)

## Verification
- [ ] User runs `npm run build`
- [ ] User tests chat with `javascript:` link
- [ ] User tests image upload with renamed non-image file
- [ ] User verifies dashboard loads cleanly
- [ ] User checks records page dropdown queries fire once

## Review

### Summary of Changes
All 11 P2 QA fixes applied across 10 files. Each change was minimal and targeted.

**Security (3 fixes):**
- SEC-10: Chat links now only render `<a>` tags for `http://` / `https://` URLs. `javascript:` protocol renders as plain text.
- SEC-11: News search API rejects queries longer than 500 characters with a 400 error.
- SEC-12: Knowledge base URL fetch now validates HTTPS-only and blocks private/internal IP addresses (localhost, 10.x, 172.16-31.x, 192.168.x, 169.254.x).

**State management (3 fixes):**
- STATE-7: `useDashboardStats` now uses `mountedRef` to guard all `setState` calls after unmount.
- STATE-8: `useImageUpload` now uses `mountedRef` to guard `setUploading` and `onError` after unmount.
- STATE-9: Service worker message listener in `push-notifications.ts` guarded by `messageListenerRegistered` flag to prevent duplicates on hot reload.

**Performance (3 fixes):**
- PERF-11: Inspection averages in `useHiveDetail` calculated in a single `for` loop instead of 6 separate passes.
- PERF-12: Dropdown options in `useRecordsData` only fetched once via `optionsLoadedRef`, skipped on subsequent `fetchAllData()` calls.
- PERF-13: `priorityOrder` object in `UpcomingEvents` moved to module-level constant.

**Error handling (1 fix):**
- ERR-12: Image uploads now validate magic bytes (JPEG, PNG, GIF, WebP signatures) to reject renamed non-image files.

**Code quality (1 fix):**
- QUAL-7: Added justification comment to `eslint-disable-next-line` in `RenewSubscriptionModal`.

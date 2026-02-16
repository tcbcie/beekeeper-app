# QA Audit Fixes - Batch 2 (Remaining P0 Issues)

## Todo Items

- [x] Fix 1: ERR-3 — Stripe Webhook NaN Guard on parseFloat
- [x] Fix 2: ERR-5 — Dashboard Stats Null Filtering
- [x] Fix 3: QUAL-2 — RenewSubscriptionModal RPC Response Validation
- [x] Fix 4: QUAL-3 — OpenAI Response Optional Chaining
- [x] Fix 5: STATE-2 — useImageUpload FileReader Cleanup
- [x] Fix 6: STATE-3 — handleCompleteTask Race Condition Guard
- [x] Fix 7: PERF-1 — Eliminate N+1 Queen Query in useHiveDetail
- [x] Fix 8: SEC-3 — Add Audit Logging to Admin Export

## Verification
- [ ] User runs `npm run build` to verify no errors
- [ ] User tests hive detail page with queen data
- [ ] User tests dashboard loads without errors
- [ ] User tests image upload (rapid changes)
- [ ] User tests task completion (rapid clicks)

## Review

### Summary of Changes

**7 files modified, 8 issues fixed.**

1. **`src/app/api/stripe/webhook/route.ts`** — Added `Number.isNaN()` guard after `parseFloat()` to prevent NaN being stored in the database when metadata contains non-numeric strings.

2. **`src/hooks/useDashboardStats.ts`** — Added `.filter(Boolean)` before type casting on all 5 activity data arrays. Prevents null entries from join failures crashing `.map()` date accesses.

3. **`src/components/RenewSubscriptionModal.tsx`** — Added shape validation on the RPC response before casting to `ActivateSubscriptionResponse`. If the response doesn't have a `success` property, returns a safe fallback object.

4. **`src/lib/openai.ts`** — Added optional chaining (`?.`) on `response.choices[0].message.content` in both `generateChatResponse` (line 37) and `classifyQuery` (line 90). Prevents crashes if OpenAI returns an empty choices array.

5. **`src/hooks/useImageUpload.ts`** — Added `useRef` for the current FileReader, aborts previous reader on rapid image changes, and aborts on component unmount via `useEffect` cleanup.

6. **`src/hooks/useHiveDetail.ts`** — Added `useRef<Set<string>>` to track in-flight task completions. Rapid clicks on the same task are now deduplicated.

7. **`src/hooks/useHiveDetail.ts`** — Merged the separate queen fetch into the main hive query using a `queens(...)` join. Eliminates one database round-trip (N+1 query).

8. **`src/app/api/admin/export-all-data/route.ts`** — Added `console.warn` audit log entries at export start and on success, including admin user ID, table count, and timestamp.

### Risk Assessment
- All changes are minimal and localised
- The queen join change (Fix 7) uses `*` on the main table so PostgREST returns `queens` as a single object, matching the existing `Hive` type definition
- No breaking API changes or schema modifications

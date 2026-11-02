# Feature: Instant Screens from a Saved Copy
**Date:** 02/11/2026
**Status:** Implemented, awaiting a real-phone check
**Programme:** Mobile native feel, Phase E (`mobile-native-feel-review-plan.md`)

## 1. Overview

Dashboard, Hives, Hive detail, Apiary detail, Records and Tasks show the last data they had straight away, on any signal, while fresh data loads behind it. If the refresh fails, the screen keeps that data and says how old it is.

This is read-only. It does not save or send anything. Saving without a signal is Phase G.

## 2. Why not TanStack Query

The plan proposed it. These screens' loading code already handles out-of-order responses, team access, paging and partial failures, so moving it would mean rewriting six screens for the same visible result. A small cache sits on top instead (`src/lib/screen-cache.ts`).

## 3. Technical Design

* **Where:** memory for instant moves between tabs, IndexedDB (`screenCache` in `src/lib/local-db.ts`) for a cold start.
* **How a hook uses it:** open the cache when a load starts, show `read()` if nothing fresh has arrived, and `save()` the result.
* **Refreshing:** unchanged. Every screen fetches on every visit, so no extra requests are made.
* **Database (MCP server):** no changes.

### Rules for changing this

* **A failed load keeps the last data.** Never replace it with an empty list.
* **"No row visible" (`PGRST116`) is not a failed load.** The record was deleted or is no longer shared, so call `forget()` and show "not found".
* **Keys always include the user id,** which `openScreenCache` does for you.
* **Cleared on sign-out** by `clearLocalUserData`. A load that began before a sign-out cannot write afterwards.
* **During impersonation** nothing is written to the device, only to memory.
* **A new build ignores earlier copies** (`NEXT_PUBLIC_BUILD_ID`, set in `next.config.ts`), so a changed data shape can't reach newer code.
* **Copies expire after 14 days.**

## 4. Task Completion

Completing a task shows at once, goes back if the save fails, and offers Undo through `toast.undoable`. The write checks for returned rows, as RLS blocks a write by returning no rows and no error.

Delete and Archive keep their confirmation. Delete is permanent and Archive runs a cascade, and delaying them to allow Undo could lose the action if the app closes.

## 5. Edge Cases & Risks

* **Older data for a moment:** a change made on another device shows after the refresh, usually within a second or two.
* **Form opened from a saved copy:** "last visit" prefills can change when fresh inspections arrive just after opening.
* **Personal data on the device:** saved copies include hive notes and team-mates' names and emails on tasks, until sign-out or 14 days. CRM data is not saved.
* **iOS can evict storage,** which simply means a normal load.

## 6. Testing Checklist (real phone)

- [ ] Move between tabs: content appears immediately, with no skeleton.
- [ ] Airplane mode, kill the app, reopen: screens show saved data and the notice with its date.
- [ ] Regain signal: the notice clears by itself.
- [ ] Airplane mode, open a new inspection: hives and dropdowns are available.
- [ ] Log out: another account on the same phone sees none of it.
- [ ] Remove a shared apiary from a team-mate: their next load shows "not found", not the saved copy.
- [ ] Complete a task: instant, Undo restores it.

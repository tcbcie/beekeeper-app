# Feature: Inspection Drafts on the Phone
**Date:** 02/11/2026
**Status:** Implemented, awaiting a real-phone check
**Programme:** Mobile native feel, Phase B (`mobile-native-feel-review-plan.md`)

## 1. Overview

A new inspection is kept on the device as it is filled in, including photographs. If the app closes, the phone dies or the save fails, the work is still there when the beekeeper comes back.

This keeps work safe. It does not send it. An inspection only reaches HiveCraic when Save succeeds. Sending later without signal is Phase G.

## 2. Behaviour

* **What is kept:** one draft per user: readings, notes, follow-up tasks, photos and the current step.
* **When:** 800ms after each change, when the app leaves the screen, and just before a save starts.
* **Coming back:** the dashboard and Records show an "Unfinished inspection" notice. Opening a new inspection offers Carry on or Start again before any fields appear, so a new inspection can never overwrite an unseen draft.
* **Editing a saved inspection:** keeps no draft.

### When a draft is removed

| Event | Removed? |
|---|---|
| Inspection saved | Yes |
| Discard confirmed, or Start again | Yes |
| Deliberate log-out | That user's draft only, after a warning |
| Password reset, account deletion | Yes |
| Session expires, or the account check signs the user out | **No.** An expired session in a field must not cost anyone their work |

## 3. Technical Design

* `src/lib/local-db.ts`: the Dexie database, opened on first use. Phase G's outbox belongs here too.
* `src/lib/inspection-draft.ts`: all draft reads and writes. Nothing in it throws. If storage is full, the draft is retried without photos.
* `src/components/records/forms/InspectionForm.tsx`: autosave and restore.
* `src/components/records/UnfinishedInspectionNotice.tsx`: the notice.
* **Database (MCP server):** no changes. Drafts live only in the browser's IndexedDB.

### Rules for changing this

* **The owner is fixed when the form opens** (`inspectionDraftOwner`). Impersonation switches the session before the page reloads, so reading the user at save time could file one person's work under another's id. No drafts are kept during impersonation.
* **Restoring must mark each fill-in as done** (`resumeDraft`). Otherwise the filter, right-sized frames, super fullness and scale effects run on the restored hive and overwrite what was entered. A new fill-in effect needs the same treatment.
* **Autosave stops during a save** (`!submitting`). A write landing after the page clears the draft would offer a saved inspection back, and invite a duplicate.
* **Autosave waits for a pending draft to be dealt with,** so it cannot overwrite one.

## 4. Saving on a Poor Signal

| Step | Limit | On failure |
|---|---|---|
| Already offline | Checked first | Immediate message, form stays open |
| Each photo | 60 seconds | Message, earlier photos removed; a late arrival is deleted |
| Weather lookup | 5 seconds | Saved without weather |
| Inspection row | 20 seconds | Message, form stays open |

If the row saved but a later step failed, the form closes and says the inspection was saved, since leaving it open invited a second save.

## 5. Edge Cases & Risks

* **A timed-out save may still have arrived.** The message says to look in Records first. Phase G removes this risk with client-generated ids.
* **iOS can evict local storage,** so a draft is a safety net and not a long-term copy.
* **Large photos:** each autosave writes the photos again. Check that it stays smooth on a real phone with several large photos. If not, store photos separately from the readings.
* **Only inspections have drafts.** Other record forms keep their dirty-form guards only.
* **A stored File on older iOS versions** has not been tested on a device.

## 6. Testing Checklist (real phone)

- [ ] Add readings and a photo, kill the app, reopen: the notice appears, and Carry on restores everything including the photo and step.
- [ ] Restored values are not overwritten by last visit's frames, supers or the scale weight.
- [ ] Start again removes the draft, and the notice does not come back.
- [ ] Save an inspection: no notice afterwards.
- [ ] Airplane mode, tap Save: clear message, nothing lost.
- [ ] Very weak signal: Save gives up within the limits above.
- [ ] Log out with a draft: warning appears. Stay logged in keeps it.
- [ ] Impersonate a user and start an inspection: no draft kept, and the admin's own draft is untouched.

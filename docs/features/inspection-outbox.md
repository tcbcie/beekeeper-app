# Feature: Saving Inspections Without a Signal
**Date:** 02/11/2026
**Status:** Implemented, awaiting a real-phone check
**Programme:** Mobile native feel, Phase G (`mobile-native-feel-review-plan.md`)

## 1. Overview

A new inspection can be saved with no signal. It stays on the phone, shows as waiting, and sends by itself when the app opens or the signal returns. With a good signal nothing looks different, except that a poor signal no longer holds the form open.

**Covered:** new inspections, including photos and follow-up tasks.
**Not covered:** editing a saved inspection, other record types, and everything else. These still need a signal, as they did before.

## 2. How a Save Works

1. The inspection goes into the outbox (`inspectionOutbox` in `src/lib/local-db.ts`), and its draft is removed.
2. It is sent, in order: photos, the row with weather, the hive's super count, follow-up tasks.
3. It leaves the outbox only once all of that is done.

| What happens | What the beekeeper sees |
|---|---|
| Sent within 8 seconds | Form closes, record in the list |
| Still sending after 8 seconds | "Saved on this phone", form closes, sending carries on |
| No signal | "Saved on this phone", form closes, listed as waiting |
| Refused while the form is open | The reason, and the form stays open to correct it |
| Refused later | Listed with the reason, Try again and Discard |

## 3. Technical Design

* `src/lib/inspection-outbox.ts`: the queue and the send.
* `src/components/records/InspectionOutbox.tsx`: the list on Dashboard and Records, and the runner in the dashboard layout.
* `src/lib/apiary-weather.ts`: moved from the Records page, so the outbox can use it.
* **Database (MCP server):** no changes. `inspections.id` and `tasks_events.id` accept an id from the client, and the insert policies apply as usual.

### Rules for changing this

* **The id is chosen on the phone.** A repeat is refused with `23505`, which means an earlier try arrived and only its answer was lost, so it counts as success. Never drop this.
* **Record progress after each step** (`uploadedUrls`, `rowSaved`), and always send from the stored entry, never a copy held on screen. A missing entry means another tab finished it.
* **The super change is attempted at most once,** because it adds to the count. It is marked done before the call. If the answer is lost, the beekeeper is warned to check, rather than risking it being counted twice.
* **Only a definite refusal is a failure** (`isRefusal`). A lost connection, an expired session, a server under strain and anything unrecognised stay queued. Losing an inspection is worse than retrying one.
* **Don't discard a refused entry silently.** It stays until the beekeeper chooses.
* **Sends can overlap,** from the form and the runner or from another tab. `inFlight` and `navigator.locks` prevent this.
* **New fields** on a queued row must still be valid when an old queued row is sent after an update.

## 4. When Entries Are Removed

| Event | Removed? |
|---|---|
| Fully sent | Yes |
| Discard | Yes, after a warning, with its uploaded photos |
| Deliberate log-out | Yes, after a warning |
| Password reset, account deletion | Yes |
| Session expires | **No.** They send after the next sign-in as the same user |

During impersonation nothing is queued, so a save with no signal shows an error and the form stays open.

## 5. Edge Cases & Risks

* **iOS has no Background Sync.** A waiting inspection sends only once the app is opened with a signal. Android behaves the same here for simplicity.
* **iOS can evict storage** after long inactivity, so an inspection left unsent for weeks is at risk. The list makes waiting work visible.
* **A crash in the moment** between marking the super change done and making it would skip the change, with no warning. The window is very small, the count is visible and editable, and this is the safe direction.
* **Weather** is recorded only if sent within two hours of saving, as later it would be the wrong weather.
* **Waiting inspections aren't in the lists** or in "last inspected" until they arrive. Prefills for the next visit won't include them either.
* **Opening with no signal:** Dashboard, Hives, Records and Tasks open if the app has been used since the last update. Hive and Apiary detail open only if visited before.
* **Storage full:** if it can't be kept on the phone, it isn't treated as saved. The form stays open with an error.

## 6. Testing Checklist (real phone)

Please test with a throwaway hive first.

- [ ] Airplane mode: save with photos and a follow-up task. "Saved on this phone", and it is listed on Dashboard and Records.
- [ ] Kill the app and reopen with no signal: still listed.
- [ ] Turn signal back on with the app open: it sends once, and appears with its photos and task.
- [ ] Check the hive's super count changed once, and there is only one record.
- [ ] Kill the app during a send, then reopen with signal: still only one record, one change to supers and one set of photos.
- [ ] Very weak signal: the form closes after about 8 seconds, and the record arrives later.
- [ ] Open the app in two tabs with a waiting inspection: one record only.
- [ ] Waiting inspection: Discard warns, then removes it.
- [ ] Log out with one waiting: warning appears. Stay logged in keeps it.
- [ ] Remove your access to a shared hive, then send a waiting inspection for it: listed with a reason, not lost.
- [ ] Save with good signal: same as before, with no duplicate.

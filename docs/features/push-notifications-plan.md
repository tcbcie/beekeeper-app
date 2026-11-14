# Push notifications for reminders — plan

**Status:** approved 13/11/2026 (subscription alone is the opt-in; a tap opens Tasks). Batch A built 14/11/2026, batch B not started · **Date:** 13 November 2026 · **Decision:** D3 in the technology stack review (build real push)

## Why

Reminders reach a beekeeper today only by email, or as a pop-up while the app happens to be open. Nothing subscribes a phone and nothing sends a push. A reminder that arrives on the lock screen is the main thing an app-store app would give that HiveCraic lacks.

## What the beekeeper gets

- One switch in **Profile → Notifications**: "Notifications on this phone".
- A task or event reminder then arrives on the phone at the time already set on the task ("remind me 60 minutes before"), whether or not the app is open.
- Tapping the notification opens the Tasks page.
- Email reminders carry on exactly as now. Push is in addition, not instead.

Treatment reminders and queen-rearing batch event reminders are already stored as ordinary task rows, so they are covered without extra work.

## What exists already (checked 13/11/2026)

| Piece | State |
|---|---|
| `push_subscriptions` table (live database) | Exists, 0 rows. Columns `user_id`, `endpoint` (unique), `p256dh_key`, `auth_key`. Four own-rows-only RLS policies. Not recorded in `supabase/migrations`. |
| Service worker `push` handler | Exists (`public/service-worker.js:303`). Shows title and body. Crashes on a non-JSON message. |
| Service worker tap handler | Always opens the Batches page; ignores what the notification was about. |
| Reminder job | `task-event-reminders` edge function, run every 15 minutes by pg_cron. Picks due rows from `tasks_events`, emails them, sets `reminder_sent`. |
| Permission-on-tap pattern, Profile Notifications section | Exist and are reused. |
| Phone subscription code, sending keys, sender | **Missing.** |

## Design (kept as small as possible)

### 1. Keys
One pair of sending keys (VAPID). The public key goes in Vercel as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; the private key goes in Supabase edge-function secrets as `VAPID_PRIVATE_KEY`. Nothing secret reaches the browser.

### 2. Saving a subscription
- New helper `src/lib/push.ts`: `enablePush()` (ask permission on the tap, subscribe, save) and `disablePush()` (unsubscribe, delete the row).
- Saving goes through one small database function, `save_push_subscription(endpoint, p256dh, auth)`, which inserts or re-assigns the row to the signed-in user. A phone shared by two accounts has one endpoint, and the existing policies would stop the second user taking it over; the function handles that safely.
- No new profile column. **Having a subscription is the opt-in.** That avoids the profile column grant and keeps the switch per phone, which is what it really is.
- A migration file records the existing table and the new function so the repo matches the live database.

### 3. The switch in Profile
One `ToggleRow` in the existing Notifications section, with four plain states:

| State | What the user sees |
|---|---|
| Off | "Get task and event reminders on this phone." |
| On | "This phone gets your reminders." |
| Blocked in the browser | "Notifications are blocked for HiveCraic. Turn them on in your phone's settings." |
| iPhone, not installed | "On an iPhone, add HiveCraic to your Home Screen first, then open it from there." |

A shared helper `isStandaloneApp()` is taken out of `InstallPrompt.tsx` for the iPhone check. The stale iPhone advice in `NotificationStatusCard.tsx` ("use the email digest instead") is corrected.

### 4. Sending
Inside the existing `task-event-reminders` function, no new job:
- For each user with due reminders, load their `push_subscriptions` rows and send one push per reminder ("Reminder: *title* — today 14:00").
- A subscription the push service reports as gone (404/410) is deleted.
- `reminder_sent` is set when the email **or** the push went out, so nothing is sent twice.
- Users who have email reminders switched off but a phone subscribed are now included (today the job skips them).

### 5. Service worker
- Tap opens the address carried in the notification (`/dashboard/tasks`), bringing an already-open HiveCraic window to the front instead of opening a second one.
- A malformed message still shows a generic notification (iPhone requires every push to show something).

### 6. Signing out
An explicit sign-out removes this phone's subscription first, so the next person on the phone does not get the previous person's reminders. An expired session does not remove it.

## Batches

**Batch A — the phone side (no sending yet)**
- [x] Generate the key pair (in `.env.local`); you add the public key to Vercel; the private key goes to Supabase secrets in batch B
- [x] Migration `20261114200000_push_subscriptions_save.sql`: records `push_subscriptions`, adds `save_push_subscription`, removes unneeded table rights; advisors checked
- [x] `src/lib/push.ts` and `isStandaloneApp()` helper
- [x] Profile switch "Reminders on this device" (using the `hivecraic-frontend-design` and `mobile-screen` skills)
- [x] Service worker: tap opens the page in the notification and brings an open window forward; safe message handling
- [x] Deliberate log-out removes the subscription (`useLogout`)
- [x] Correct the iPhone copy in `NotificationStatusCard.tsx`
- [ ] You test: switch on, see one row appear for your account; sign out, row gone

**Batch B — sending**
- [ ] `task-event-reminders`: send push alongside email, prune dead subscriptions, shared sent marker
- [ ] Redeploy the function with its `_shared` file
- [ ] You test: a task due in 20 minutes with a 15-minute reminder, app closed, on Android and on an iPhone installed to the Home Screen
- [ ] Feature document `docs/features/push-notifications.md`, guidance file and `.env.example` updated

## Risks and open points

- **Sending library.** The usual `web-push` package is written for Node. Supabase edge functions run it through their npm support, but I have not proved it there. First step of Batch B is a one-off test send; the fallback is a Deno-native library (`@negrel/webpush`).
- **iPhone.** Works only from iOS 16.4 and only after "Add to Home Screen". Many users will need the instruction; there is no guided install screen today. Not in this plan.
- **Timing.** The job runs every 15 minutes, so a reminder can arrive up to 15 minutes late. Same as email today.
- **Queen-rearing "browser notifications" per batch** (the pop-up while the app is open) stay as they are. Batch dates reach push only where "email reminders for batch events" is on for that batch, because that is what creates the task rows.
- **No test button.** A "send me a test" button needs a second sender. Left out for simplicity; say if you want it.

## Decisions for the owner

1. Should a phone subscription alone be enough to get reminders (as planned), or should push also obey the "Task reminders" / "Event reminders" email switches?
2. Is opening the Tasks page on tap right, or should a hive reminder open that hive?

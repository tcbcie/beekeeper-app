# Push notifications (reminders on this device)

**Status:** batch A (phone side) live 14/11/2026; batch B (sending) built 14/11/2026, waiting for the `VAPID_KEYS` secret and deployment. Plan: `push-notifications-plan.md`.

## What the beekeeper gets

- **Profile → Notifications → "Reminders on this device".** Switching it on asks for notification permission (on the tap) and saves this device's subscription.
- Task, event, treatment and batch-event reminders then appear on the device at the reminder time set on the task, even when HiveCraic is closed. Tapping one opens the Tasks page.
- Email reminders carry on unchanged. Push is in addition.
- A subscription alone is enough: push does not follow the email "Task reminders" / "Event reminders" switches (owner decision, 13/11/2026).

## Where it works

| Device | Works |
|---|---|
| Android (Chrome, Edge, Samsung Internet), desktop Chrome, Edge, Firefox | Yes |
| iPhone / iPad, iOS 16.4 or later | Only from the Home Screen icon, after "Share → Add to Home Screen". In Safari the switch explains this. |
| Other browsers | The switch says they cannot show reminders. |

## How it works

| Part | Where |
|---|---|
| Switch and wording | `src/app/dashboard/profile/page.tsx` (Notifications section) |
| Permission, subscribe, save, switch off, state | `src/lib/push.ts` |
| Saving | `save_push_subscription()` (migration `20261114200000`). One row per device endpoint; a second account signing in on the same device takes it over. |
| Log-out | `useLogout` calls `removePushOnSignOut()` before signing out (gives up after 3 s without signal; the device is unsubscribed either way). |
| Showing and tapping | `public/service-worker.js` `push` and `notificationclick` handlers. A tap opens `data.url` and brings an open window forward. |
| Sending | `supabase/functions/task-event-reminders` (pg_cron, every 15 minutes), `sendPushReminders()` using `jsr:@negrel/webpush@0.5.0` |

Sending rules:

- Due reminders are read before anything is marked sent, so a reminder due now goes out by email and by push in the same run.
- `tasks_events.reminder_sent` is set when the email **or** a push went out. A failed push is tried again on the next run unless the email went out.
- Disabled accounts get no pushes.
- A subscription the push service reports gone (404 or 410) is deleted.
- Each send has a 10-second limit. A push fault never fails the run.
- One notification per reminder on the device (`tag: reminder-<id>`), even if sent twice.

## Settings

| Name | Where | What |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel and `.env.local` | Public sending key, given to the browser when subscribing. |
| `VAPID_KEYS` | Supabase edge-function secrets only (copy in `.env.local`) | Both keys as JSON Web Keys: `{"publicKey": {...}, "privateKey": {...}}`. Unset means email only. |

The two must be the same key pair. Changing the keys means every device must switch the reminders off and on again.

## Limits

- A reminder can arrive up to 15 minutes late (the job runs every 15 minutes), as with email.
- The in-app queen rearing pop-ups (per batch "browser notifications") are separate and only show while the app is open.
- Other sign-outs (disabled account, ending impersonation, password reset) keep the subscription; the sender skips disabled accounts.
- There is no "send me a test" button.

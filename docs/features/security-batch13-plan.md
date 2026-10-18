# Security Batch 13: Phase 2 Security Hotfix

**Status:** Done 18/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch13-todo.html`
**Findings:** C7a-02 (High), C9a-01 (Medium), C2-31 (Low), from the Phase 2 audit (`full-app-audit-phase2-findings.md`). This is Phase 2 fix batch 1.

## Apiary location picker (C7a-02)

- `MapLocationPicker.tsx` shows markers for the user's other apiaries, including team-shared ones. Its popups were built with `setHTML()` from the raw apiary name, so a team member could craft a name that ran script in another user's session.
- The popup is now a `div` whose `textContent` is the name, passed to `setDOMContent()`. All the other map popups in the app already escaped their text.
- **Rule:** never pass user-written text to Mapbox `setHTML()`. Use `setDOMContent()` with `textContent`, or escape it first.

## Change Password (C9a-01)

- Profile → Change Password used to call `updateUser({ password })` without checking the "current password" field, so anyone with an unlocked session could change the password.
- `src/lib/verify-password.ts` has `verifyCurrentPassword(email, password)`. It signs in with a throwaway Supabase client (`persistSession: false`, its own `storageKey`), so the real session is untouched. Then it signs that temporary session out (`scope: 'local'` revokes it on the server).
- A wrong password shows "Your current password is incorrect", and nothing is changed.
- Accounts created with Google and no password can't use this form. They set a password with "Forgot password", as before.

## Reminder and digest emails (C2-31)

- `task-event-reminders` and `weekly-email-digest` put user-written text straight into their HTML emails.
- Both now use the same `escapeHtml()` as the other email functions. The reminder escapes the title, description, location, category and first name; the digest escapes the batch name, event type and first name.
- Deployed through MCP: `task-event-reminders` v13 and `weekly-email-digest` v16, both with `verify_jwt` off as before. The live versions matched the repo before deploying, and both still return 401 without the webhook secret.

## Verification

- `npx tsc --noEmit` shows no errors in `src/`, and ESLint is clean on the changed files.
- The owner tested the picker popups and both password paths (wrong refused, right accepted).

# Add Voice Recording / Transcription to Rearing Batch Notes

## Goal

Replicate the voice-record + auto-transcribe Notes pattern that already exists on the Inspection form, and add it to the Notes field on the Queen Rearing batch form (`/dashboard/batches`, the "Weather conditions, acceptance rate, observations..." textarea at `src/app/dashboard/batches/page.tsx:1387-1395`).

## Existing pieces reused (no changes)

- `src/hooks/useVoiceRecorder.ts` — MediaRecorder hook (start/stop/reset)
- `src/app/api/voice-notes-transcribe/route.ts` — generic transcribe endpoint (already used by InspectionForm; does its own subscription gating)
- `src/lib/auth.ts` `hasActiveSubscription()` — already in the codebase

## Pattern copied from `src/components/records/forms/InspectionForm.tsx`

- State: `voiceProcessing`, `voiceError`, plus the destructured hook output
- `appendVoiceTranscript(cleaned)` — appends to `formData.notes`, separated by `\n\n`
- `handleToggleVoice()` — start, or stop + POST blob to `/api/voice-notes-transcribe`
- Mic / Square / Loader2 button below the textarea, gated on `userHasActiveSubscription && isVoiceSupported`

## Todo

- [x] Imports: add `Mic`, `Square`, `Loader2` to the lucide-react import; add `hasActiveSubscription` from `@/lib/auth`; add `useVoiceRecorder` from `@/hooks/useVoiceRecorder`
- [x] State: add `userHasActiveSubscription`, `voiceProcessing`, `voiceError`; destructure `useVoiceRecorder()`
- [x] In the existing `initUser` effect, also call `hasActiveSubscription()` and set the state
- [x] Add `appendVoiceTranscript` (callback writing into `formData.notes`) and `handleToggleVoice` (mirrors InspectionForm)
- [x] In `resetForm()`, also call `resetVoiceRecorder()` and clear voice error/processing
- [x] Insert the Mic/Stop/Transcribing button + error line directly below the Notes `<textarea>`, inside the same `<div>` (only rendered when subscribed and supported)
- [x] Update `docs/features/voice-notes-field.md` to note that the Queen Rearing batch Notes field is now covered by the same feature
- [x] Review section at the bottom of this file when done

## Out of scope

- No DB / API changes — endpoint and schema already exist
- Other Notes textareas in the app (only the batch form is requested)
- No new UI library imports — reuse existing `Button`, lucide icons, Tailwind classes

## Review

All changes are confined to one source file plus a small docs update.

### `src/app/dashboard/batches/page.tsx`

- **Imports** — added `hasActiveSubscription` from `@/lib/auth`; added `Mic`, `Square`, `Loader2` to the lucide-react imports; added `useVoiceRecorder` from `@/hooks/useVoiceRecorder`.
- **State** — added `userHasActiveSubscription` plus voice-recorder state (`voiceProcessing`, `voiceError`) and the destructured hook (`isVoiceRecording`, `isVoiceSupported`, `voiceRecorderError`, `startVoiceRecording`, `stopVoiceRecording`, `resetVoiceRecorder`).
- **`initUser` effect** — also reads subscription status and stores it.
- **Two new callbacks** — `appendVoiceTranscript(cleaned)` (writes into `formData.notes` with `\n\n` separator) and `handleToggleVoice()` (start, or stop + POST blob to `/api/voice-notes-transcribe`). Logic is a 1:1 copy of the InspectionForm version.
- **`resetForm`** — now also calls `resetVoiceRecorder()` and clears the voice error/processing state so a partially-completed recording doesn't leak across edits.
- **JSX** — inserted the Mic/Stop/Transcribing button + error line directly below the Notes `<textarea>`. Gated on `userHasActiveSubscription && isVoiceSupported`. Same Tailwind classes and three button states (idle/recording/processing) as the inspection form.

### `docs/features/voice-notes-field.md`

- Added a "Where it is wired up" section listing both surfaces (Inspection form and Queen Rearing batch form) and documenting that adding the feature to a new Notes field is just state + button + handler — no API or DB work.

### Reused infrastructure (no changes)

- `src/hooks/useVoiceRecorder.ts`
- `src/app/api/voice-notes-transcribe/route.ts` (does its own subscription check)
- `src/lib/auth.ts` `hasActiveSubscription()`

### Things to test (user)

- Subscribed user opens the batch form → Record button visible below Notes.
- Record 5–10s → cleaned transcript appears in the Notes textarea, separated from any pre-existing text by a blank line.
- Cancel/close form mid-recording → microphone indicator stops (stream tracks released).
- Editing an existing batch → recorder is fresh; previous voice state from the last edit doesn't bleed through.
- Non-subscribed user → button is hidden.

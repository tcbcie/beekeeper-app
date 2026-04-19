# Voice Notes (Notes Field Only) — Todo

Full plan: `docs/features/voice-notes-field.md`

Scope recap: record audio on the Inspection form → Whisper transcription → GPT clean-up → append cleaned text to the Notes textarea. No audio storage, no structured field extraction.

## Todo

- [x] **1. Create `useVoiceRecorder` hook** — `src/hooks/useVoiceRecorder.ts`. Wraps `MediaRecorder`, exposes `isRecording`, `isSupported`, `error`, `startRecording()`, `stopRecording(): Promise<Blob|null>`, `reset()`. Cleans up stream tracks on unmount.
- [x] **2. Create API route** — `src/app/api/voice-notes-transcribe/route.ts`. Bearer auth → subscription check → FormData parse (≤25 MB) → Whisper → GPT-4o-mini clean-up → returns `{ transcript, cleaned }`.
- [x] **3. Wire up `InspectionForm.tsx`** — imports, hook init, state, `handleToggleVoice`, append-to-notes merge, button UI under Notes textarea, reset hooks in cancel + initialData effect.
- [x] **4. Feature doc** — `docs/features/voice-notes-field.md`.
- [ ] **5. User to test** — per CLAUDE.md, user runs the build and exercises the manual verification checklist.

## Decisions (confirmed by user)

1. Append cleaned transcript to existing Notes (separated by blank line).
2. British English in the GPT clean-up prompt.
3. Gated behind active subscription.
4. Whisper called with `language: 'en'`.

## Review

### Summary of changes

- **`src/hooks/useVoiceRecorder.ts` (new, ~125 lines).** `MediaRecorder` wrapper. Picks the first supported mime type from `webm;opus → webm → mp4 → ogg`. `stopRecording()` returns a promise resolving to the assembled `Blob` once `onstop` fires, so the caller can await the final blob without racing. `reset()` and an unmount effect both call `cleanupStream()`, which stops every track on the `MediaStream` — prevents the browser's "mic in use" indicator from being left on if the user cancels mid-record.
- **`src/app/api/voice-notes-transcribe/route.ts` (new, ~110 lines).** Mirrors the auth + subscription gate from `src/app/api/chat/route.ts`. Validates the audio file (non-empty, ≤25 MB). Calls Whisper (`whisper-1`, `language: 'en'`), then GPT-4o-mini at `temperature: 0.2` with a British-English clean-up prompt that forbids adding information. If the GPT call fails, we fall back to the raw transcript instead of 500-ing — the user still gets their words back. Returns `{ transcript, cleaned }`.
- **`src/components/records/forms/InspectionForm.tsx` (~80 lines added).** New imports (`Mic`, `Square`, `Loader2`, `useVoiceRecorder`, `supabase`). After `useImageUpload`, the form calls `useVoiceRecorder()` and tracks `voiceProcessing`/`voiceError`. `handleToggleVoice` either starts recording or (if already recording) stops, awaits the blob, POSTs it with the Supabase access token, and appends the `cleaned` text to `formData.notes` using `existing.trimEnd() + '\n\n' + cleaned` so earlier typed text is preserved. The Record/Stop/Transcribing button sits directly under the Notes textarea, gated on `userHasActiveSubscription && isVoiceSupported`. Voice state is reset alongside image state in `handleCancel` and the `initialData` cleanup branch.

### Scope honoured

- No DB migration, no Supabase Storage bucket, no audio persisted. Blob lives only in browser memory until the POST resolves.
- No structured-field extraction. The larger `voice-inspection.md` doc describes that future expansion.
- No new npm dependencies. Uses existing `openai` SDK and browser-native `MediaRecorder`.

### Notes for verification

- Subscribed user on desktop Chrome: should see purple "Record voice note" button under Notes. Recording → red pulsing "Stop recording". After stop → purple "Transcribing..." spinner → cleaned text appended to Notes.
- Non-subscribed user: button hidden (server also rejects with `SUBSCRIPTION_REQUIRED` if client-side gate is somehow bypassed).
- Browser without `MediaRecorder` (or permissions refused at OS level): `isSupported` returns false and the button is hidden entirely. Permission denied at runtime surfaces through `voiceRecorderError`.
- iOS Safari: `MediaRecorder` support is present in iOS 14.3+ but spotty on older versions — the hook falls back through the mime-type list; if none are supported the button stays hidden.

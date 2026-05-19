# Voice Notes (Notes Field Only)

## Overview

A lightweight variant of the planned `voice-inspection.md` feature. Instead of extracting 40+ structured fields from speech, this feature records a voice note, transcribes it via OpenAI Whisper, cleans up the transcript via GPT (punctuation, grammar, removal of filler words), and **pastes the cleaned text into a Notes textarea** — nothing else in the form is touched.

This keeps scope minimal, ships fast, and gives beekeepers the biggest immediate win (dictating a paragraph of observations while gloved up) without the complexity of field extraction.

## Where it is wired up

- **Inspection form** — `src/components/records/forms/InspectionForm.tsx` (Notes section).
- **Queen Rearing batch form** — `src/app/dashboard/batches/page.tsx` (Notes section under the grafting/batch form).

Both surfaces share the exact same UI and reuse the same `useVoiceRecorder` hook and the single `/api/voice-notes-transcribe` endpoint. The API route does its own subscription gating, so adding the feature to a new Notes field is a copy-paste of state + button + handler.

## Problem

Typing free-form observation notes on a phone while inspecting a hive is awkward. A quick dictation is much faster. Raw Whisper output is usable but contains filler words ("um", "uh"), run-on sentences, and no punctuation — a light GPT clean-up makes the text pleasant to read later.

## User Flow

1. Open the Inspection form (must have an active subscription).
2. Below the Notes textarea, tap the purple **Record Voice Note** button.
3. Speak freely — e.g. "queen was seen, lots of eggs, five frames of brood, bees calm today, took one frame of stores".
4. Tap **Stop** (same button, now red and pulsing).
5. A spinner appears ("Transcribing..."). Audio is POSTed to `/api/voice-notes-transcribe`.
6. The server transcribes (Whisper) then cleans up (GPT-4o-mini).
7. Cleaned text is **appended** to whatever is already in the Notes textarea (with a leading newline if the field is non-empty), so existing typed notes are never overwritten.
8. User can edit the result freely before saving.

## Accuracy

Apiculture vocabulary (varroa, propolis, supersedure, foulbrood, Apiguard, NIHBS, etc.) is generic-conversation-rare, so out-of-the-box speech-to-text routinely mishears it. Two server-side levers are applied in `src/app/api/voice-notes-transcribe/route.ts`:

1. **Transcription bias** — `APICULTURE_PROMPT` (≈200 tokens, packed under the 224-token cap) is passed as the `prompt` parameter to the OpenAI transcription call. This biases the acoustic model toward beekeeping vocabulary before any text is produced.
2. **Cleanup correction map** — `CLEANUP_SYSTEM_PROMPT` includes a misheard→corrected examples block (e.g. *"borrow a" → "varroa"*, *"proper list" → "propolis"*, *"fowl brood" → "foulbrood"*). GPT-4o-mini fixes leftover mishears the acoustic bias did not catch, with strict instructions never to invent a correction when the spoken word is unclear.

Transcription model is `gpt-4o-transcribe` (upgraded from `whisper-1`) — same SDK call signature, materially better on accented and noisy audio, `prompt` parameter still respected.

A future per-user glossary table is sketched in `tasks/voice-transcription-accuracy-todo.html` (Phase 2). It is gated on real-world evidence from Phase 1 — ship the static bias first, measure, then decide whether per-user terms add enough value to justify the schema and CRUD UI.

## Non-Goals (explicit)

- **No audio storage.** The blob lives only in memory on the client and is discarded after transcription. No Supabase Storage bucket, no DB column.
- **No structured field extraction.** Queen-seen, star ratings, frame counts, etc. stay manual. That is the job of the larger `voice-inspection.md` feature if we build it later.
- **No real-time transcription preview.**
- **No playback UI on inspection cards.**

## Architecture

```
[Record button] → MediaRecorder → Blob (webm/mp4)
     ↓
[POST /api/voice-notes-transcribe]  (multipart/form-data)
     ├── Whisper (whisper-1)  → raw transcript
     └── GPT-4o-mini          → cleaned transcript (punctuated, filler removed)
     ↓
[Append to formData.notes in InspectionForm]
```

## Implementation Plan

### Task 1 — Create `useVoiceRecorder` hook
**File (new):** `src/hooks/useVoiceRecorder.ts`

- Wraps `navigator.mediaDevices.getUserMedia` + `MediaRecorder`.
- Picks `audio/webm` or `audio/mp4` based on `MediaRecorder.isTypeSupported`.
- Exposes: `isRecording`, `isSupported`, `error`, `startRecording()`, `stopRecording(): Promise<Blob | null>`, `reset()`.
- Cleans up media stream tracks on stop/unmount.
- ~70 lines. No external deps.

### Task 2 — Create API route `/api/voice-notes-transcribe`
**File (new):** `src/app/api/voice-notes-transcribe/route.ts`

Flow (copied from `src/app/api/chat/route.ts` 1-63):
1. Verify Bearer token via `supabaseAdmin.auth.getUser`.
2. Check `subscription_expires_at` on `profiles`. Return 403 `SUBSCRIPTION_REQUIRED` if expired.
3. Parse `FormData`, extract `audio` file, reject if missing or `> 25 MB`.
4. Call Whisper: `getOpenAI().audio.transcriptions.create({ model: 'whisper-1', file, language: 'en' })`.
5. Pass transcript to GPT-4o-mini with a short system prompt:
   > "You are cleaning up dictated beekeeping notes. Keep the meaning and all details. Fix punctuation, capitalisation, and grammar. Remove filler words (um, uh, like, you know). Do not add information that was not said. Return only the cleaned text, no preamble. Use British English."
   - `temperature: 0.2`, `max_tokens: 600`.
6. Return `{ transcript: string, cleaned: string }`. Client uses `cleaned`; `transcript` returned for potential future UI/debugging.

Errors:
- 400 — missing/too-large audio
- 401 — missing/invalid auth
- 403 — subscription expired
- 502 — OpenAI failure (include `code: 'OPENAI_ERROR'`)

~90 lines.

### Task 3 — Add Voice button + handler to `InspectionForm.tsx`
**File (modify):** `src/components/records/forms/InspectionForm.tsx`

- Add imports: `Mic, Square, Loader2` (lucide), `useVoiceRecorder`, `supabase` (for auth token).
- Instantiate `useVoiceRecorder()` near the existing `useImageUpload` hook (~line 53).
- Local state: `voiceStatus: 'idle' | 'recording' | 'processing'`, `voiceError: string | null`.
- Handler `handleToggleVoice()`:
  - If `idle` → `startRecording()`, set `recording`.
  - If `recording` → `await stopRecording()` → if blob present, POST to `/api/voice-notes-transcribe` with `Authorization: Bearer <access_token>` from `supabase.auth.getSession()`.
  - On success → `setFormData(prev => ({ ...prev, notes: prev.notes ? prev.notes.trimEnd() + '\n\n' + cleaned : cleaned }))`.
  - On failure → set `voiceError`.
- Reset via `resetVoice()` in existing `handleCancel` (line 333) and the `initialData` reset effect.
- UI placement: **directly under the Notes textarea** (line ~1012), not the form header. This keeps the button visually tied to its target field.
  - Gated by `userHasActiveSubscription && isSupported`.
  - Button states:
    - idle: purple, `Mic` icon, label "Record voice note"
    - recording: red, pulsing, `Square` icon, label "Stop recording"
    - processing: disabled, `Loader2` spinner, label "Transcribing..."
  - Error message rendered in a small red box below the button when `voiceError` is set.

~50 lines added. No changes to the `onSubmit` signature — audio blob stays inside the form.

### Task 4 — Feature documentation
**File (this one):** `docs/features/voice-notes-field.md` — create.

### Task 5 — Manual verification (user to run)
Per CLAUDE.md, the user runs the build. The AI does not run `npm run build`.

Verification checklist (user):
- [ ] Subscribed user sees the Record button; non-subscribed user does not.
- [ ] Browser without `MediaRecorder` hides the button.
- [ ] Deny mic permission → friendly error shown, form still usable.
- [ ] Record 10-15s of bee-chat → cleaned text appears in Notes within ~5s.
- [ ] Existing text in Notes is preserved (new transcript appended with blank line).
- [ ] Save inspection → Notes column in DB contains the cleaned text.
- [ ] Cancel during recording → stream tracks released (no mic indicator left on).
- [ ] Works on Android Chrome PWA; test iOS Safari where MediaRecorder is partial.

## Files Summary

| File | Action | Approx. lines |
|------|--------|---------------|
| `src/hooks/useVoiceRecorder.ts` | Create | ~70 |
| `src/app/api/voice-notes-transcribe/route.ts` | Create | ~90 |
| `src/components/records/forms/InspectionForm.tsx` | Modify | ~50 added |
| `docs/features/voice-notes-field.md` | Create | this file |

**No DB migration, no Storage bucket, no new npm dependencies.** Uses the existing `openai` package and browser APIs.

## Open Questions for User

1. **Append or replace?** Plan currently *appends* the cleaned transcript to any existing Notes content (separated by a blank line). Alternative: replace. Recommendation: append — safer for users who type first, then record addenda.
2. **British English clean-up?** Plan forces British English in the GPT prompt (consistent with the project-wide instruction in CLAUDE.md). Confirm this is desired for transcripts.
3. **Subscription gating?** Plan gates the feature behind an active subscription, matching the existing image-upload and chat patterns. Confirm.
4. **Language hint?** Plan passes `language: 'en'` to Whisper. If users may dictate in other languages, drop the hint and let Whisper auto-detect.

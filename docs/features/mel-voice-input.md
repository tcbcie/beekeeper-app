# Mel voice input

**Status:** Built, waiting for testing on a real phone (15 November 2026)

## Problem

Mel, the virtual assistant, only takes typed questions. At the apiary a beekeeper is often gloved, holding a smoker or a frame, and typing a question on a phone is slow and fiddly. Most of our users are 50+, and many find a phone keyboard hard work.

## What the beekeeper gets

A microphone button next to Send in Mel's message box.

1. Tap the **microphone**. Mel's message box shows "Listening… tap stop when you have finished".
2. Ask the question out loud, for example "When did I last feed hive 3 at the home apiary?"
3. Tap **stop** (same button, now red with a square).
4. The button shows a spinner while the speech is turned into text.
5. The words appear in the message box. They are **not sent automatically**, so the beekeeper can check them and correct a misheard word.
6. Tap **Send** as usual.

Any typed text already in the box is kept, and the spoken words are added after it.

## How it works

It reuses the voice notes pipeline (`docs/features/voice-notes-field.md`):

- **Recording:** `useVoiceRecorder` (`src/hooks/useVoiceRecorder.ts`), unchanged.
- **Transcription:** `POST /api/voice-notes-transcribe`, which already checks sign-in, account status, subscription and rate limits, and already biases transcription towards beekeeping words (varroa, supersedure, Apiguard and so on).
- **One small server change:** the route always runs a second AI call that tidies dictated *inspection notes*. That rewrite suits notes, not questions, and costs an extra round trip. Mel's box sends a form field `cleanup=false`, and the route then returns the transcript without the tidy-up. Forms that send nothing behave exactly as before.

The microphone is shown only where the browser can record (`isSupported`). Like Mel itself, it has no subscription check on the phone. The server refuses non-subscribers, and the box shows "An active subscription is required to use voice input."

Voice for Mel shares the voice rate limits (20 an hour, 60 a day) with voice notes.

## Files

- `src/components/chat/ChatInput.tsx`: the microphone button (48px, outlined; solid red while recording), the record and transcribe handler, and a status line that screen readers announce. Send is disabled while recording or transcribing. Closing Mel stops the recording and drops any transcription still in flight.
- `src/app/api/voice-notes-transcribe/route.ts`: the optional `cleanup=false` field.
- `docs/features/voice-notes-field.md`: notes Mel as a third user of the route.

The Send button was already 48px: `.fj-icon-btn` sets a 48×48px minimum that overrides its `h-10 w-10`.

## Out of scope

- Mel speaking her answers aloud.
- Sending automatically when the beekeeper stops talking.
- Moving the copied voice code in the inspection and batch forms into a shared hook.

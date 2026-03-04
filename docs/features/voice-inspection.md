# Voice Inspection Feature

## Overview

Allows beekeepers to create inspection records by recording a voice note instead of manually filling 40+ form fields. The audio is transcribed using OpenAI Whisper and structured data is extracted using GPT to auto-populate the inspection form.

## Problem

Beekeepers in the field often wear gloves, hold a smoker, and have bees buzzing around them. Tapping through dozens of form fields on a phone is painful and slow. A quick voice recording is far more practical during an active hive inspection.

## User Flow

1. Open the inspection form (user must have an active subscription)
2. Tap the **Voice** button in the form header
3. Speak naturally about observations, e.g.:
   > "Queen seen, eggs present, 5 frames of brood, temperament a 4, population strength 5, saw 3 queen cups, removed all of them, no swarm cells, weight 25 kilos, colony looking very healthy"
4. Tap **Stop** to end recording
5. Audio is sent to the server for processing (transcription + extraction)
6. Form fields auto-populate with extracted data
7. Transcription text is displayed for reference
8. User reviews, corrects any fields if needed, and saves
9. Voice note audio file is stored alongside the inspection record

## Architecture

```
[Mic Button] → MediaRecorder API → audio blob (webm/mp4)
     ↓
[POST /api/voice-inspection]
     ├── OpenAI Whisper (whisper-1) → transcription text
     └── OpenAI GPT (gpt-4o-mini) → structured JSON fields
     ↓
[Auto-fill InspectionForm] → user reviews → save to DB
     ↓
[Supabase Storage: voice-notes bucket] → voice_note_url stored in inspections table
```

---

## Implementation Plan

### Task 1: Database migration - add `voice_note_url` column
- Add nullable `voice_note_url text` column to `inspections` table
- Run via Supabase MCP `apply_migration`
- No RLS changes needed (existing row-level policies cover all columns)

### Task 2: Create `voice-notes` Supabase Storage bucket
- Create public bucket `voice-notes` with RLS policies matching `inspection-images` pattern
- Run via Supabase MCP `apply_migration`

### Task 3: Update TypeScript types
**File:** `src/types/records.ts`
- Add `voice_note_url: string | null` to `Inspection` interface (after `image_url` line 87)
- Add `voice_note_url: string | null` to `InspectionFormData` interface (after `image_url` line 258)
- Add `voice_note_url: null` to `getDefaultInspectionFormData()` return (after `image_url: null` line 419)

### Task 4: Create API route `/api/voice-inspection`
**File to create:** `src/app/api/voice-inspection/route.ts`

**Flow:**
1. Auth check via Bearer token (copy pattern from `src/app/api/chat/route.ts` lines 18-61)
2. Subscription check (same pattern)
3. Parse `FormData`, extract audio file, validate size <= 25MB
4. Call OpenAI Whisper (`whisper-1`) for transcription using `getOpenAI()` from `src/lib/openai.ts`
5. Call GPT (`gpt-4o-mini`) with `response_format: { type: 'json_object' }` to extract structured inspection fields from the transcription
6. Return `{ transcription: string, fields: Partial<InspectionFormData> }`

**GPT system prompt:** Describes each InspectionFormData field with its type and valid values. Instructs GPT to only return fields explicitly mentioned in the transcription. Unmentioned fields are omitted (not set to defaults).

**Key fields to map:**
- Booleans: `queen_seen`, `eggs_present`, `drone_brood_present`, `queen_cups`, `swarm_cells`, `supercedure_cells`, `emergency_cells` + their `_removed_all` variants
- Star ratings (1-5): `population_strength`, `temperament_rating`, `brood_pattern_rating`, `swarming_tendency`, `calmness`, disease indicators, hygienic behaviour
- Numbers: `brood_frames` (1-10), `weight`, frame counts, queen cell counts
- Text: `notes` (anything that doesn't map to a structured field)

### Task 5: Create `useVoiceRecorder` hook
**File to create:** `src/hooks/useVoiceRecorder.ts`

**Pattern:** Follows `src/hooks/useImageUpload.ts` (useState, useCallback, useRef, cleanup on unmount)

**Responsibilities:**
- Request microphone permission via `navigator.mediaDevices.getUserMedia`
- Record audio using browser `MediaRecorder` API (webm or mp4 depending on support)
- Collect chunks and produce a `Blob` on stop
- Clean up media stream tracks on stop/unmount
- Expose: `isRecording`, `audioBlob`, `startRecording()`, `stopRecording()`, `reset()`

**Not responsible for:** API calls or form filling (that stays in InspectionForm to keep the hook simple and reusable)

### Task 6: Add voice UI to InspectionForm
**File:** `src/components/records/forms/InspectionForm.tsx`

**Changes:**
1. **Imports:** Add `Mic, Square, Loader2` to lucide import; import `useVoiceRecorder`; import `supabase` from `@/lib/supabase`
2. **Hook init:** After existing `useImageUpload` (line ~53), initialise `useVoiceRecorder()`
3. **State:** Add `isProcessing`, `transcription`, `voiceError` via useState
4. **Processing function:** `handleVoiceProcess` - sends audioBlob to `/api/voice-inspection`, receives fields, merges into formData via `setFormData(prev => ({ ...prev, ...fields }))`
5. **Effect:** Trigger `handleVoiceProcess` when `audioBlob` changes
6. **Mic button UI:** In the form header (line 306-329), add a mic/stop button next to Save/Cancel, gated behind `userHasActiveSubscription`. Also check `navigator.mediaDevices` support before showing.
   - Not recording: purple button with Mic icon + "Voice"
   - Recording: red pulsing button with Square icon + "Stop"
   - Processing: disabled button with spinning Loader2 + "Processing..."
7. **Transcription display:** Below the header (after line 329), show transcription text in a purple info box and errors in a red box
8. **Reset:** Add `resetVoice()` calls in `handleCancel` and the `initialData` reset effect
9. **Pass audioBlob to parent:** Update `onSubmit` prop signature to include `audioBlob: Blob | null`

### Task 7: Update records page submission to handle voice notes
**File:** `src/app/dashboard/records/page.tsx`

**Changes to `handleInspectionSubmit` (line 458):**
1. Add `audioBlob: Blob | null` parameter
2. After image upload block (line 470), add voice note upload:
   - Upload blob to `voice-notes` bucket in Supabase Storage (same pattern as image upload)
   - Get public URL
3. Include `voice_note_url` in `submitData` (line 493-501)

### Task 8: Create feature documentation
**File:** `docs/features/voice-inspection.md` (this file)

---

## Files Summary

| File | Action | Impact |
|------|--------|--------|
| `src/types/records.ts` | Modify | +3 lines |
| `src/app/api/voice-inspection/route.ts` | Create | ~120 lines |
| `src/hooks/useVoiceRecorder.ts` | Create | ~70 lines |
| `src/components/records/forms/InspectionForm.tsx` | Modify | ~60 lines added |
| `src/app/dashboard/records/page.tsx` | Modify | ~20 lines added |
| `docs/features/voice-inspection.md` | Create | Feature doc |
| DB migration (via MCP) | Apply | 1 column + 1 bucket |

**No new dependencies.** Uses browser MediaRecorder API and existing `openai` package.

---

## Field Mapping Reference

The GPT extraction prompt maps natural language to these InspectionFormData fields:

### Booleans
| Field | Example phrases |
|-------|----------------|
| `queen_seen` | "queen seen", "spotted the queen", "no queen" |
| `eggs_present` | "eggs present", "saw eggs", "no eggs" |
| `drone_brood_present` | "drone brood present", "no drone brood" |
| `queen_cups` | "queen cups", "saw cups" |
| `swarm_cells` | "swarm cells", "no swarm cells" |
| `supercedure_cells` | "supercedure cells" |
| `emergency_cells` | "emergency cells" |
| `*_removed_all` | "removed all", "left them" |

### Star Ratings (1-5)
| Field | Example phrases |
|-------|----------------|
| `population_strength` | "population 5", "strong colony", "weak population" |
| `temperament_rating` | "temperament 4", "calm bees", "aggressive" |
| `brood_pattern_rating` | "brood pattern 3", "good brood pattern" |
| `swarming_tendency` | "swarming tendency 2", "low swarming" |
| `calmness` | "calmness 4", "very calm" |
| Disease indicators | "no AFB", "slight chalkbrood" |
| Hygienic behaviour | "good recapping", "VSH 3" |

### Numbers
| Field | Example phrases |
|-------|----------------|
| `brood_frames` (1-10) | "5 frames of brood", "brood on 7 frames" |
| `weight` | "25 kilos", "weight is 30" |
| `queen_cups_number` etc. | "3 queen cups", "saw 2 swarm cells" |
| Frame counts | "gave 2 foundation frames", "added a super" |

### Text
| Field | Example phrases |
|-------|----------------|
| `notes` | Anything that doesn't map to a structured field |

---

## Access Control

- **Subscription required** - consistent with image upload gating
- **Server-side check** - API route verifies `subscription_expires_at` in profiles table
- **Client-side check** - mic button only shown when `userHasActiveSubscription` is true

## Browser Support

- Requires `navigator.mediaDevices.getUserMedia` (available in all modern browsers)
- Requires `MediaRecorder` API
- Mic button is hidden if browser doesn't support these APIs
- Works in PWA mode on Android
- Note: iOS Safari has limited MediaRecorder support (WebM not supported, falls back to MP4)

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Microphone permission denied | Error message shown in form |
| Browser doesn't support MediaRecorder | Mic button not shown |
| Empty recording | Validated before sending to API |
| Whisper/GPT API failure | Error message shown, form remains manually editable |
| Subscription expired mid-session | API returns 403, error shown |
| Audio too large (>25MB) | API returns 400 with size error |

## Verification

1. Run `npm run build` to check for TypeScript/lint errors
2. Test recording flow: open inspection form as subscribed user, tap Voice, speak, tap Stop, verify form fields populate
3. Test non-subscribed user: mic button should not appear
4. Test browser without microphone support: mic button should not appear
5. Test error handling: deny mic permission, verify error message shows
6. Test submission: save a voice-filled inspection, verify `voice_note_url` is stored in DB
7. Check Supabase Storage `voice-notes` bucket for uploaded audio file

## Future Enhancements

- Audio playback in inspection card (listen back to voice notes)
- Multi-language support (Whisper supports 90+ languages)
- Real-time transcription preview while recording (Web Speech API)
- Voice notes for other record types (varroa checks, treatments, feeding)
- Offline recording with sync when back online

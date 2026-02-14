# Make Feedback Optional on Public Trace Page

## Plan
Add a `show_feedback` toggle to batches (identical pattern to `show_apiary_image`) so beekeepers can choose whether the "How was this honey?" section appears on the public trace page.

## Todo

- [x] **DB Migration** — Add `show_feedback` boolean column to `batch_runs` (default `true` for backwards compat)
- [x] **Update RPC** — Add `show_feedback` to the `get_public_batch_info` return object
- [x] **TypeScript types** — Add `show_feedback` to `BatchRun` and `BatchFormData` in `src/types/traceability.ts`
- [x] **Batch form** — Add toggle checkbox in `TraceabilityTool.tsx` (next to the apiary image toggle area)
- [x] **Form state** — Wire `show_feedback` into form init, reset, edit-load, and save
- [x] **Public trace page** — Conditionally render `<FeedbackForm>` based on `show_feedback` from batch info
- [x] **Update docs** — Update feature documentation

## Review

### Changes Made

| File / Resource | Change |
|-----------------|--------|
| `batch_runs` table (migration) | Added `show_feedback` boolean column, default `true` |
| `get_public_batch_info` RPC (migration) | Added `show_feedback` to the returned JSON object |
| `src/types/traceability.ts` | Added `show_feedback: boolean` to `BatchRun` and `BatchFormData` |
| `src/components/tools/TraceabilityTool.tsx` | Added toggle checkbox, wired into init/reset/edit-load/save |
| `src/app/(trace)/trace/[batchCode]/page.tsx` | Added `show_feedback` to `BatchInfo` type; conditionally renders `<FeedbackForm>` |
| `docs/features/batch-feedback.md` | Documented the optional feedback toggle |

### How It Works
- New `show_feedback` boolean on `batch_runs` defaults to `true` (all existing batches keep showing feedback)
- Beekeepers toggle it in the batch form — checkbox sits below the apiary image toggle
- The RPC returns `show_feedback` to the public trace page
- The trace page only renders `<FeedbackForm>` when `show_feedback` is not `false`

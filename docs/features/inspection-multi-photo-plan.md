# Feature: Multiple Photographs per Inspection

**Date:** 04/09/2026
**Status:** Implemented - awaiting browser verification by the owner
**Supersedes for inspections:** the single-photo behaviour described in `records-stale-image-removal-plan.md` and `image-enlargement-affordance-plan.md`

> **The complaint, in the owner's words:** "I cannot attach more than one image. Even though it gives me the placeholder to attach a second one. However, if I do so, the first one is gone."

**Outcome.** An inspection now carries up to six photographs. The report was not only a missing feature but a genuine UI defect: the form showed what looked like an empty second slot that silently overwrote the first photo.

---

## 1. The complaint, and what the code said

### 1a. The state held exactly one file

`src/hooks/useImageUpload.ts` held `imageFile: File | null` and one preview. `handleImageChange` read only `e.target.files?.[0]` and called `setImageFile(file)`, which replaces. The file input had no `multiple` attribute, so even multi-selecting in the OS picker yielded only file `[0]`.

### 1b. The schema held exactly one URL

`inspections.image_url` was a scalar `text`. There was nowhere to put a second photo. At the time of the change: **1,757 inspections, 74 with a photograph.**

### 1c. The phantom second slot

In `InspectionForm.tsx` the thumbnail and the dashed drop zone were siblings in a flex row, and **only the thumbnail was conditional**. Once a photo was attached the beekeeper saw the thumbnail plus a full "Click to upload or drag and drop" box beside it - indistinguishable from an empty second slot, but wired to the same single-file handler. This is what made the behaviour read as a bug rather than a limit.

---

## 2. Scope

In: the inspection form (step 4), the inspection card, the shared image viewer, the records read/write path, and the schema.

Out, deliberately: varroa checks, apiary photos, wild colonies and diagnosis images all keep their existing single-image behaviour. Storage cleanup - see section 6.

---

## 3. Design

### D1 - An array column, with the old column kept as a derived mirror

```sql
ALTER TABLE public.inspections ADD COLUMN image_urls text[] NOT NULL DEFAULT '{}';
UPDATE public.inspections SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url <> '';
ALTER TABLE public.inspections DROP COLUMN image_url;
ALTER TABLE public.inspections ADD COLUMN image_url text GENERATED ALWAYS AS (image_urls[1]) STORED;
```

**Why an array rather than an `inspection_images` child table**, despite the `diagnosis_images` precedent:

| | `text[]` column | child table |
|---|---|---|
| New RLS policies | none - inherits `inspections` RLS | 4, and SELECT must re-derive `can_access_hive()` through the parent |
| The ~20 `select('*')` read sites | get the photos free | every one needs an explicit join |
| User backup (`database-export.ts`) | exported free | silently omitted unless registered |
| Photo order | array order | needs a `sort_order` column - no precedent in this schema |
| Per-photo captions later | needs a migration | free |

Inspection photographs carry no metadata, so the array wins everywhere it matters. `diagnosis_images` is a child table because those rows carry `description`, `diagnosis_type` and an entire comments table; it is a standalone research gallery, not photographs belonging to a parent record.

**Why `image_url` survives as a generated mirror.** Over twenty places read it - the AI tools, the hive detail page, the data export, the dashboard feeds. As `GENERATED ALWAYS AS (image_urls[1]) STORED` every one keeps working untouched and always shows the first photograph, while there is still exactly one source of truth so the two can never drift. It also fails *loudly*: any write site still targeting the old column is rejected by Postgres with `42P10` rather than silently diverging.

Verified live before adoption, on a throwaway probe table since dropped: `{a.jpg, b.jpg}` yields `a.jpg`; an empty array yields `NULL`; and `UPDATE ... SET image_url = ...` is refused.

### D2 - One validated upload path

`src/app/dashboard/records/page.tsx` carried a **second, weaker copy** of the upload logic - no magic-byte check, no MIME allow-list, no 10MB limit - and it was the copy that actually ran for inspections. The validated implementation was extracted to **`src/lib/upload-image.ts`**; `useImageUpload` now calls it (its nine other callers unchanged), and the duplicate is gone. Uploading N photographs needs one trustworthy function, so this was on the critical path, not opportunistic tidying.

### D3 - Staged photographs get their own small hook

**`src/hooks/useStagedPhotos.ts`** holds files picked but not yet uploaded. Kept separate from `useImageUpload` because widening that hook would have put nine other forms at risk. Previews use object URLs rather than FileReader data URLs - no async read, and six 10MB photographs held as base64 would be a real memory cost on a phone. The hook owns revoking them.

### D4 - Step 4 UI

Cap **six**. Thumbnails stay 80x80 with the existing zoom badge and red remove button; saved photographs get a grey border, newly staged ones a blue one. The drop zone moved *below* the strip, reads "Add more photos - 3 of 6 attached" once anything is attached, gained `multiple`, and **disappears at the cap**. Selecting more than the remaining allowance keeps the first N and says so inline, in the same style as the voice-note error. The `userHasActiveSubscription` gate is unchanged.

### D5 - Reading surfaces

- `InspectionCard` shows the first photograph with a `+N` badge; tapping opens the viewer on the whole set.
- `ImageZoomModal` gained **optional** `images` and `startIndex` props with 44px previous/next controls, an "N of M" chip and arrow-key paging. The existing `imageUrl` prop still works, so apiaries, varroa checks and diagnosis images are untouched.
- `records/page.tsx` holds one `modalImages` array; `handleImageClick(url)` is now a one-line wrapper over `handleGalleryClick(urls, index)`, so single-image callers share the code path.
- The `Inspection` -> `InspectionFormData` mapping is an explicit whitelist and needed `image_urls` adding, or photographs would vanish on every edit.
- The review step reports a count; `InspectionStepper`'s hand-synced step-4 description was updated to the plural alongside it.
- Dirty-state: removing a saved photograph edits `formData.image_urls` and is caught by the existing JSON diff for free; only newly staged files need the extra clause.

---

## 4. Risks accepted

- **The generated column rejects writes.** That is the intent, but a missed write site throws at runtime. Only one existed (the `submitData` spread) and it was carved out.
- **The backfill is one-way** once `image_url` is dropped and recreated. The 74 affected rows were snapshotted first - see section 5.
- **Offline is unaffected**: there is no write queue, no background sync and no draft persistence for inspections (a `File` is not serialisable, which is why).

---

## 5. Database connections (MCP server)

All schema work went through the Supabase MCP server; no SQL files were written or parsed.

Migrations applied:
1. `inspections_multi_photo_image_urls` - the D1 DDL.
2. `move_inspection_image_backup_out_of_public` - see below.

Verified after migrating: 1,757 total, 74 with photographs, 74 with the mirror populated, **zero backfill mismatches** against the snapshot. A rolled-back probe confirmed a three-photo write, clearing to empty, and rejection of a legacy `image_url` write.

**A finding from `get_advisors`, caught and fixed.** The pre-migration snapshot was first created as `public._inspection_image_url_backup_20260904`, and the security advisor flagged it: a table in `public` is exposed through PostgREST, and it had no RLS - every account's photo URLs readable by any authenticated caller. It is a migration safety net, not application data, so it was moved to a new `backups` schema with `USAGE` revoked from `anon` and `authenticated`, and renamed to `backups.inspection_image_url_20260904`. Confirmed afterwards: 74 rows intact, nothing left behind in `public`, neither role able to see the schema.

**That table is safe to drop once multi-photo is confirmed in production.**

---

## 6. Follow-up not done here: orphaned storage objects

Nothing in this app has ever deleted an inspection photograph from Supabase Storage. Replacing one, removing one, or deleting the entire inspection all leave the file behind; the same is true of varroa checks and apiary images. The only `.storage.remove(` call in the codebase is in `DiagnosisImagesTab.tsx`.

Multi-photo **multiplies an existing leak rather than creating one**, so it was deliberately left out of scope and raised with the owner instead of being smuggled in. A proper fix spans inspections, varroa checks and apiaries and deserves its own plan.

---

## 7. QA audit, second pass (04/09/2026)

A second audit went deeper than the first and found four further defects, all introduced by this change and all now fixed.

**Critical - side effects inside React state updaters.** `useStagedPhotos` called `URL.createObjectURL` and `URL.revokeObjectURL` inside `setStaged(prev => ...)`. Updater functions must be pure, and React invokes them more than once in StrictMode and whenever a concurrent render is discarded and replayed. Each replay of `addFiles` created a second blob URL per file and kept only one, leaking the other for the lifetime of the page; a replayed `removeFile`/`reset` could revoke a URL belonging to state that survived, leaving a permanently broken thumbnail. The hook was rewritten so the ref is the authoritative list, every object-URL call happens outside the updater, and state is handed a finished array.

**High - the six-photo cap could be breached.** Making the pick handler `async` for pick-time validation meant two picks could be in flight at once, both reading the same stale slot count from a render closure and both appending. The cap is now enforced inside the hook against its own synchronously-updated ref.

**High - orphans on any failure after upload, not just upload failure.** The first pass only cleaned up when the upload loop itself failed. A database error, a failed honey-super adjustment or a rejected optimistic update would also leave uploaded photos with no row pointing at them. Cleanup now runs on every failure path - but guarded by a `recordSaved` flag, because past the successful insert the saved inspection references those photos and deleting them would break a real record.

**Medium - the shared viewer could lock page scroll with nothing on screen.** `ImageZoomModal` set `body.overflow = 'hidden'` before the early return that renders nothing when no usable URL resolves, leaving the page unscrollable with no viewer to dismiss. The lock is now conditional on there being something to show. Also hardened: `showPrevious`/`showNext` guard against `% 0` (which yields `NaN`), and the gallery list is memoised because panning re-renders on every mousemove and was re-parsing a URL per photo per frame.

Two findings were recorded and deliberately **not** changed:
- The per-thumbnail remove button is ~28px, below the 44px guidance, which matters more now there can be six. It is the design approved in `image-enlargement-affordance-plan.md`, and a 44px control on an 80px tile is a visual decision for the owner.
- The count of already-saved photos is still read from a render closure in the pick handler, so removing a saved photo during the sub-millisecond header read could leave the cap off by one. Reachability is negligible and the fix would add machinery out of proportion to it.

## 8. Verification

- `tsc --noEmit`: no errors in `src/`.
- `next lint` on every changed file: clean (the only warnings are pre-existing, in `dashboard/tasks/page.tsx`).
- `tests/components/records/`: 32 passed. The two suites that mocked `useImageUpload` were retargeted at `useStagedPhotos`, keeping the regression they guard - that a photograph-only edit counts as unsaved work.
- The wider suite has **137 pre-existing failures across 18 files** (auth, changelog, StatCard, GDD tracker, ingest utils and similar). Confirmed identical at `HEAD` in a clean worktree before and after this change, so none are attributable to it.

**Still to do: browser verification by the owner.** Attach two or three photographs to an inspection, save, reopen, remove the middle one, save again, and check the card badge and the viewer's next/previous.

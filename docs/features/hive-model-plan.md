# Feature: Hive model (hive system, make, material and photo per hive)
**Date:** 03/11/2026
**Status:** Implemented 03/11/2026 (photo on both model and hive; Type label unchanged; all 5 phases)

## 1. Overview
A power user with six out-apiaries runs a mix of cedar and Abelo hives, and Payne's, Abelo and Maismore nucs. He wants each hive to show what equipment it is (with a photo), so he knows which compatible gear to bring on a visit, and perhaps later an inventory.

This feature lets every user describe their equipment once as a **hive model**, for example "Abelo poly National" or "Payne's poly nuc". It then lets them pick a model for each hive. A model records:

- the hive system (National, Langstroth, Commercial and so on)
- the make
- the material
- whether it is a full hive or a nuc
- frames per box
- a photo
- notes

The hive card, hive detail page and apiary visit then show which model each hive uses and which frame size it takes.

Why a hive model table rather than columns on each hive:
- **Less typing.** Users are 50+, and a power user with dozens of hives describes each kind of equipment once, then picks it per hive. Bulk select can set it on many hives at once.
- **One photo per kind of equipment**, not one per hive.
- **A base for inventory.** A future inventory can count boxes and frames per model or per system without changing hives again.

## 2. Scope & Simplicity
* **In Scope:**
  * New global, admin-managed reference table `hive_systems`. It is seeded with National, Commercial, Langstroth, Dadant, Smith, WBC, Warré, Top bar and Other. Each system links to the existing `frame_standards` for its brood and super frames.
  * New per-user table `hive_models`. One model = one kind of equipment the user owns.
  * New nullable column `hives.hive_model_id` (FK, `ON DELETE SET NULL`).
  * A "My hive models" page (linked from the Profile page tools list and from the hive form). On it the user can add, edit and delete models, with an optional photo.
  * A "Hive model" picker in the hive form. Picking a model on a **new** hive fills in hive size and frames per box, flagged as a fill-in. It never overwrites values on an existing hive.
  * Optional per-hive photo: new `hives.image_url`, uploaded from the hive form to `apiary-images/<uid>/hives`. Anywhere a photo is shown, the hive's own photo is used when it has one, otherwise the model photo.
  * Hive card: a model line ("National · Abelo · Poly") with a small photo thumbnail that enlarges on tap.
  * Hive detail page: a "Hive model" row and the photo.
  * Bulk action on the Hives list: **Set hive model** for the selected hives.
  * Apiary visit: a "Hive models here" summary on the apiary page and in the visit checklist. It lists hives per model and frame sizes needed (for example "6 × Abelo poly National, National deep frames"), so the beekeeper knows what to bring.
  * Clone hive copies the model.
  * Mel `getHiveOverview` returns the model name and system.
  * Admin settings: a Hive systems manager, a copy of `FrameStandardsManager`.
  * Export lists, storage cleanup and documentation.
* **Out of Scope:**
  * Inventory or stock counts of boxes, frames and feeders. This is a later feature built on `hive_models` and `hive_systems`.
  * A model for queen-rearing mating nucs (Apidea, Kieler). A later `mating_nucs.hive_model_id` would reuse the same table.
  * Mixed equipment in one hive, such as cedar brood with poly supers. Use the model notes.
  * Drawing the model in the 3D apiary view or the yard map, such as cedar against poly colours.
  * Changing `hives.hive_type`. It stays the colony purpose (Production, Split, Swarm), and its "Type" label stays as it is (owner's decision).
* **Existing Code Impact:**
  * `src/components/hive/HiveFormSection.tsx` (picker and fill-in)
  * `src/components/hive/HiveListCard.tsx` (model line)
  * `src/app/dashboard/hives/[id]/page.tsx` (detail row)
  * `src/app/dashboard/hives/page.tsx` (bulk action and clone)
  * `src/types/hive.ts`
  * `src/app/dashboard/profile/page.tsx` (one link)
  * `src/app/dashboard/tasks/page.tsx` (checklist summary)
  * the apiary detail page (summary)
  * `src/lib/ai/tools/hives.ts`
  * `src/lib/database-export.ts`
  * the settings page (one section)
  * New files: the model page, `HiveModelManager`, `HiveModelPicker`, `useHiveModels`, `HiveSystemsManager`, and `src/lib/hive-model.ts` (labels and the summary helper).

## 3. Technical Design
### Architecture
```
frame_standards (existing, admin)
      ▲ brood_frame_standard_id / super_frame_standard_id
hive_systems (new, admin, global)
      ▲ hive_system_id
hive_models (new, per user)  ── image_url → apiary-images/<uid>/hive-models/…
      ▲ hive_model_id (nullable, ON DELETE SET NULL)
hives (existing)
```
- The hives queries already select `*`, so `hive_model_id` arrives for free. Models are loaded once per screen by `useHiveModels()`, which runs a single `.in()` lookup on the model ids in view and caches them per user. The model is resolved client-side by id. There is no PostgREST embed, which avoids the problem of to-one embeds coming back in different shapes.
- Photos use the existing `useImageUpload` / `uploadImageFile` with bucket `apiary-images` and folder `<uid>/hive-models`. The current storage policy already allows this, because the first folder is the user's id. **No storage policy change.**
- Manufacturer is free text with a datalist of suggestions: Abelo, Payne's, Maismore, Thorne, Swienty, Lyson, Modern Beekeeping, plus the user's own past values. This is the same pattern as the queen Mating Station field. No table.
- Material is a fixed list: Cedar, Pine, Poly, Plywood, Other.
- Every save button uses `useSubmitLock`. Every update or delete on a record table a team-mate can see uses the `.select('id')` zero-row check.

### Database Connections (MCP Server)
All changes are made through the Supabase MCP `apply_migration`, and the migration is also saved in `supabase/migrations/`.

1. `hive_systems`:
   - columns: `id uuid pk`, `name text unique not null`, `brood_frame_standard_id uuid → frame_standards null`, `super_frame_standard_id uuid → frame_standards null`, `default_frames_full smallint`, `default_frames_nuc smallint`, `display_order int`, `is_active bool default true`
   - RLS: authenticated users can read; only admins can write (same as `frame_standards`)
   - seeded with the nine systems above
2. `hive_models`:
   - columns: `id uuid pk`, `user_id uuid not null → profiles default auth.uid()`, `name text not null check (length(trim(name)) between 1 and 80)`, `hive_system_id uuid → hive_systems null`, `hive_size text check in ('full','nuc') default 'full'`, `manufacturer text null`, `material text check in ('cedar','pine','poly','plywood','other') null`, `frames_per_box smallint check between 1 and 20 null`, `image_url text null`, `notes text null`, `created_at`, `updated_at`
   - `unique (user_id, lower(name))`, index on `user_id`
   - RLS:
     - insert, update and delete: owner only (`user_id = (select auth.uid())`)
     - select: the owner, **or** any user who can access a hive using the model (`exists (select 1 from hives h where h.hive_model_id = hive_models.id and can_access_hive(h.id))`), so team-mates see the model on shared hives
   - storage-cleanup triggers `queue_orphaned_images_update` / `_delete` on `image_url`, and `hive_models` added to `is_storage_url_referenced()`
3. `hives.hive_model_id uuid null references hive_models(id) on delete set null`, plus an index. Also `hives.image_url text null` for the per-hive photo, with the same storage-cleanup trigger pair, and `hives` added to `is_storage_url_referenced()`.
   - A `BEFORE INSERT OR UPDATE OF hive_model_id` guard trigger, firing only when the value changes, rejects a model whose `user_id` differs from `hives.user_id`. This stops anyone attaching another user's model.
   - Apiary ownership transfer does not touch `hive_model_id`, so the guard does not fire. The new owner sees the old model read-only until they pick one of their own.
4. Grants:
   - Tables need no new function grants.
   - The guard trigger function is `SECURITY INVOKER` with `search_path = public`.
   - Run `get_advisors` after the DDL.
5. Optional one-off:
   - Seven existing hives hold "National", "Langstroth" or "Commercial" in `hive_type`.
   - Leave them alone and tell the owner; their owners can pick a model.

## 4. Edge Cases & Risks
* **Team-mates editing a shared hive:** the model picker is shown only when the signed-in user owns the hive. Others see the model read-only, and the DB guard enforces this.
* **Deleting a model used by hives:** confirm "Used by N hives — they will show no model". `ON DELETE SET NULL` clears the model from those hives. Deleting the photo is handled by the cleanup queue, with its 7-day grace period.
* **Fill-in on new hives only:** choosing a model sets `hive_size` and `frames_per_*`. The fill-in is flagged so an untouched form stays clean (see the form-autofill rule), and it never changes the configuration of an existing hive. That configuration has its own history.
* **Inspections:** inspections keep reading frames per box from `configuration` as now. The model never drives inspections directly.
* **Offline:** models load through the screen cache like other field screens. If a model lookup fails, the hive still shows; the model line is simply hidden and the screen never shows an empty list.
* **Photo:** 4 image types, 10 MB, signature check (existing helper). A failed save after upload removes the uploaded file (`deleteUploadedImages`).
* **Duplicate names:** the unique index returns 23505, shown as "You already have a model with this name".
* **Export:** `hive_models` is added to `DATABASE_EXPORT_TABLES` and `USER_EXPORT_TABLES`, and `hive_systems` to `DATABASE_EXPORT_TABLES`. The order matters: systems, then models, then hives.
* **Hard delete of a user:** models cascade with the profile, and the photos are queued for cleanup.
* **UI rules:**
  * 14px minimum text, sentence case, 48px targets
  * the `mobile-screen` skill for the model page and picker
  * dark mode
  * "apiary", never "yard"

## 5. Implementation Phases
1. **Phase 1 — Database:** `hive_systems` (seeded), `hive_models`, `hives.hive_model_id`, guard trigger, RLS, storage cleanup, advisors, migration file.
2. **Phase 2 — Model management:** types, `useHiveModels`, `src/lib/hive-model.ts`, the My hive models page and `HiveModelManager` with a photo, a Profile link, and the export lists.
3. **Phase 3 — Hives:** form picker with fill-in, optional hive photo, card model line with photo (hive photo, falling back to the model photo), detail row, clone (copies the model but not the hive photo), and the bulk Set hive model action.
4. **Phase 4 — Visit and Mel:** "Hive models here" summary on the apiary page and in the visit checklist, and the Mel overview field.
5. **Phase 5 — Admin and docs:** `HiveSystemsManager` in settings, this doc set to Implemented, the About page feature list, and the QA audit.

## 6. As built (03/11/2026)
* **Database:** migration `supabase/migrations/20261103120000_hive_models.sql`, applied via MCP. Checked in a rolled-back transaction:
  * a hive accepts its owner's model and refuses another user's (42501)
  * duplicate names are refused (23505)
  * deleting a model clears it from its hives
  * a removed hive photo is queued for cleanup
  * another user cannot see an unattached model
  * `get_advisors` raised nothing new.
* **Files:**
  * `src/types/hive-model.ts`, `src/lib/hive-model.ts` (labels, `describeHiveModel`, `modelFramesPerBox`, `hivePhotoUrl`, `summariseHiveModels`)
  * `src/hooks/useHiveModels.ts` (one plain select each for models, systems and frame sizes; screen-cached)
  * `src/app/dashboard/hive-models/page.tsx` + `src/components/hive/HiveModelManager.tsx`
  * `src/components/hive/PhotoField.tsx` (shared by models and hives)
  * `src/components/hive/SetHiveModelModal.tsx` (bulk)
  * `src/components/hive/HiveModelDetail.tsx` (hive page)
  * `src/components/hive/HiveModelsHere.tsx` (apiary page and visit checklist)
  * `src/components/settings/HiveSystemsManager.tsx` (admin)
* **Differences from the plan:**
  * The hive form picker is inline in `HiveFormSection`, not a separate `HiveModelPicker`.
  * Hive systems are retired (`is_active`), never deleted, so models keep their system name.
  * The visit checklist summary covers the hives that have tasks in the checklist, titled "Hive models for these tasks".
* **Hive form:** on an existing hive, `hive_model_id` is sent only when it changed. This stops a stale saved copy re-sending a deleted model.
* **Bulk action:** the button is "Model" on phones and "Hive model" from `sm` up. Only the user's own hives and models are used.
* **Mel:** `getHiveOverview` returns `hiveModel`, e.g. "Abelo poly National (National · Abelo · Poly)".

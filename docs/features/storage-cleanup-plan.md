# Feature: Storage Cleanup for Replaced and Deleted Photos

**Date:** 04/09/2026
**Status:** Implemented - awaiting `CRON_SECRET` in Vercel and browser verification by the owner
**Follows:** `inspection-multi-photo-plan.md`, which flagged this leak and deliberately left it out of scope

**Outcome.** Photographs that are replaced, removed, or whose record is deleted are now removed from Supabase Storage. Capture happens inside the database, so it also covers deletions no client code ever sees. An audit found **24 already-orphaned objects totalling 94 MB** - about 17% of the 541 MB held in the two buckets.

---

## 1. Why the obvious fix would not have worked

The obvious approach is to delete the object beside each `.delete()` and each replacement, as `DiagnosisImagesTab` did. The schema rules it out:

```
inspections.hive_id    -> hives     ON DELETE CASCADE
varroa_checks.hive_id  -> hives     ON DELETE CASCADE
inspections.user_id    -> profiles  ON DELETE CASCADE
```

Deleting **one hive** removes every inspection and varroa check beneath it entirely inside the database. No client code sees those rows, so no client-side handler can clean up after them - and this is the largest single leak in the app.

`hard_delete_user` is worse: it purges every record a user owns and then the user is gone, so nothing running as that user could ever tidy up afterwards. Any design that depends on the owner being present is structurally incapable of handling it.

Capture therefore has to happen where the deletion happens: in Postgres.

---

## 2. Design

```
  row deleted / photo replaced          queue row                     nightly
  (client, cascade, or RPC)     -->   storage_cleanup_queue   -->   /api/cron/storage-cleanup
         AFTER trigger                 (url, queued_at)              service role, batch remove
                                                                       |
                                               still referenced? ------+--> skip & drop from queue
                                               older than 7 days? -----+--> remove object
```

### S1 - One URL to (bucket, path) helper

`storagePathFromPublicUrl()` in `src/lib/storage-url.ts`. It splits on the `/storage/v1/object/public/` constant rather than a bucket name, strips query and fragment, percent-decodes each segment, and **returns null when the host is not the current project**. That host check is the point: legacy rows carry an older Supabase hostname and those objects live in a different project's bucket, where a derived path would at best delete nothing and at worst hit an unrelated object. It replaced two duplicated `split()` calls.

### S2 - Queue table and triggers

`public.storage_cleanup_queue (id, image_url UNIQUE, source_table, queued_at, attempts, last_error)`. The unique constraint makes re-queuing idempotent. RLS is enabled with **no policies**, which denies `anon` and `authenticated` outright; only the service role touches it. (The security advisor reports this as INFO "RLS enabled, no policy" - that is the intended design, not a defect.)

One generic trigger function, `queue_orphaned_storage_objects()`, told by `TG_ARGV` which columns to watch. Each column may be `text` or `text[]`; both are read through `to_jsonb` and normalised to an array, so one function serves every table. On DELETE it queues everything the old row referenced; on UPDATE it queues whatever was in OLD but not in NEW - exactly "replaced or removed".

Installed on all six image-bearing tables (`inspections`, `varroa_checks`, `apiaries`, `wild_colonies` with two columns, `wild_colony_inspections`, `diagnosis_images`) as **twelve** triggers: an UPDATE trigger carrying a `WHEN (OLD.col IS DISTINCT FROM NEW.col)` clause, and a separate DELETE trigger. The `WHEN` clause matters - `inspections` and `apiaries` are updated on every edit and almost none touch a photograph, so without it the function would convert a whole row to jsonb on every save. DELETE needs its own trigger because a `WHEN` clause there cannot reference NEW.

### S3 - The sweeper

`src/app/api/cron/storage-cleanup/route.ts`, service role, authorised by a `CRON_SECRET` bearer token, registered in `vercel.json` to run at 03:00 daily. It takes up to 200 rows past the grace period, groups them by bucket so each bucket is one `remove()` call, and clears the queue rows that settled. Supabase reports which objects it actually removed; anything not confirmed is left queued and its `attempts`/`last_error` recorded, so a persistently stuck object becomes visible rather than silently forgotten.

### S4 - The two safety rails

1. **Never delete a URL a row still references.** `is_storage_url_referenced()` checks all six tables and is called immediately before deletion. A queued photo can legitimately come back - an edit removes it, a later edit restores it, and the queue row is still sitting there. The queue is a suggestion; the live tables are the authority. Destroying a live photo is far worse than leaving an orphan.
2. **A seven-day grace period.** Nothing is deleted until it has been queued for a week, so a mistaken delete stays recoverable.

### S5 - Storage policies tightened

Both buckets previously allowed **any authenticated user to delete or update any object**, checking only `bucket_id` - so one beekeeper could delete another's photographs. Those four policies were dropped and replaced with a single owner-scoped one:

```sql
CREATE POLICY "Users can delete their own uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('inspection-images','apiary-images') AND owner = (SELECT auth.uid()));
```

The client still needs delete in exactly one situation - undoing its own partially-completed batch upload (`deleteUploadedImages`), where the objects were uploaded moments earlier by the same user. Everything else goes through the queue and the service-role sweeper, which bypasses RLS. UPDATE was not restored: uploads always use `upsert: false` with a fresh random filename, so nothing overwrites an existing object.

### S6 - The one existing implementation simplified

`DiagnosisImagesTab` removed the storage object *first* and the row second, swallowing the storage error. If the row delete then failed, the row survived pointing at a deleted object - a permanently broken image, worse than an orphan. It now deletes only the row and lets the trigger queue the file.

---

## 3. Verification

All on the live database through the MCP server, on throwaway probe tables that were dropped afterwards:

| Case | Result |
|---|---|
| Photo removed from a `text[]`, others kept | only the dropped URL queued |
| Whole row deleted | every remaining URL queued |
| Scalar `image_url` replaced | old URL queued, new one not |
| Edit that touches no photo | nothing queued (the `WHEN` clause) |
| **Row removed by an FK cascade** (parent deleted only) | **URL queued** - the case no client-side fix could reach |
| Photo removed then restored | `is_storage_url_referenced` returns true, so the sweeper skips it |
| Unknown URL | `is_storage_url_referenced` returns false |

Also confirmed: `queue_orphaned_storage_objects` and `is_storage_url_referenced` are executable by `service_role` only, not `anon` or `authenticated`; twelve triggers installed; no probe tables left behind; `tsc` and `eslint` clean.

The 24 already-orphaned objects were **queued, not deleted directly**, so they pass through the same guard and the same seven-day grace as everything else.

---

## 3a. QA audit findings, fixed

**High - the sweeper could be aimed at any bucket in the project.** Queued URLs originate from user-editable columns, so a crafted `image_url` could name a bucket the job knows nothing about and that `is_storage_url_referenced` does not protect. The sweeper runs as the service role and bypasses RLS, so it now decides for itself what it owns: a `SWEEPABLE_BUCKETS` allowlist. Anything else is refused and logged. (Targeting another user's photo *within* the two known buckets was already blocked by the reference guard, which sees the victim's row still pointing at it.)

**High - 200 sequential round-trips per run.** The reference check called the single-URL function once per queue row. Added `filter_unreferenced_storage_urls(text[])` so one call answers the whole batch, and a failure there now aborts the run rather than silently skipping rows.

**Medium - a permanently failing object was retried every night forever.** The query now skips rows past `MAX_ATTEMPTS`, leaving them in the queue with their `last_error` for inspection.

**Low** - constant-time comparison of the cron secret, de-duplication of two URLs resolving to one object key (query strings are stripped), and a set rather than a linear scan when reconciling failures.

---

## 4. Before this works in production

**`CRON_SECRET` must be set in the Vercel project.** Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to scheduled routes; without it the route returns 500 and the sweep never runs. Nothing is deleted until it is set, which is the safe failure direction.

---

## 5. Not covered

Uploads that **never reached a row** are invisible to a database trigger. The inspection form cleans those up itself (`records/page.tsx`), but the apiary, varroa-check, wild-colony and wild-colony-inspection upload flows have no equivalent, so a failed save after a successful upload still orphans there. That is a separate fix across four flows; the nightly sweep will not catch it because nothing ever queues those URLs.

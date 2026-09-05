import { timingSafeEqual } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { storagePathFromPublicUrl } from '@/lib/storage-url'

// Fail-fast at module init so a missing env surfaces at deploy time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'storage-cleanup: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

/**
 * Photos wait this long before being removed for good, so a delete made by
 * mistake stays recoverable for a week. Orphans cost pennies of storage; a
 * destroyed photograph is gone.
 */
const GRACE_PERIOD_DAYS = 7

/** Bounded so one run cannot stall on a huge backlog; the next run picks up the rest. */
const BATCH_SIZE = 200

/**
 * The only buckets this job may ever delete from.
 *
 * Queued URLs originate from user-editable columns, so a crafted value could name
 * any bucket in the project - including one this job knows nothing about and whose
 * contents nothing in is_storage_url_referenced would protect. The sweeper runs as
 * the service role and bypasses RLS, so it must decide for itself what it owns.
 */
const SWEEPABLE_BUCKETS = new Set(['inspection-images', 'apiary-images'])

/** Stop retrying an object that will not delete, but leave the row for inspection. */
const MAX_ATTEMPTS = 5

/** Constant-time compare, so the cron secret cannot be probed byte by byte. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

interface QueueRow {
  id: string
  image_url: string
  attempts: number
}

/**
 * Nightly sweep: delete Storage objects that no row references any more.
 *
 * The queue is populated by the queue_orphaned_storage_objects triggers, which
 * fire inside the database. That matters because inspections and varroa checks
 * cascade from hives, so deleting a hive removes their rows without any client
 * code seeing them - and hard_delete_user removes the owner too. Cleanup driven
 * from the client could never cover either case.
 *
 * The queue is treated as a suggestion, never as authority: every URL is
 * re-checked against the live tables immediately before deletion, because a
 * removed photo can legitimately be put back by a later edit.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }
  if (!secretMatches(request.headers.get('authorization'), `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('storage_cleanup_queue')
    .select('id, image_url, attempts')
    .lt('queued_at', cutoff)
    .lt('attempts', MAX_ATTEMPTS)
    .order('queued_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    console.error('storage-cleanup: could not read the queue:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const queued = (rows ?? []) as QueueRow[]
  if (queued.length === 0) {
    return NextResponse.json({ examined: 0, deleted: 0, stillReferenced: 0, unresolvable: 0, failed: 0 })
  }

  // Group the deletable ones by bucket so each bucket takes a single remove call.
  const pathsByBucket = new Map<string, string[]>()
  const rowIdByObject = new Map<string, string>()
  const resolvedRowIds: string[] = []
  const stillReferencedRowIds: string[] = []
  const unresolvableRowIds: string[] = []

  // Authority check for the whole batch in one call: never delete an object a row
  // still points at. A queued photo can legitimately come back, so the queue is a
  // suggestion and the live tables are the truth.
  const { data: unreferencedRows, error: refError } = await supabaseAdmin
    .rpc('filter_unreferenced_storage_urls', { p_urls: queued.map(row => row.image_url) })

  if (refError) {
    console.error('storage-cleanup: reference check failed, deleting nothing:', refError)
    return NextResponse.json({ error: refError.message }, { status: 500 })
  }

  const unreferenced = new Set(
    ((unreferencedRows ?? []) as { image_url: string }[]).map(row => row.image_url)
  )

  for (const row of queued) {
    if (!unreferenced.has(row.image_url)) {
      // The photo came back. Drop the queue entry and leave the file alone.
      stillReferencedRowIds.push(row.id)
      continue
    }

    const ref = storagePathFromPublicUrl(row.image_url)
    if (!ref) {
      // Not a public storage URL of this project - most likely a legacy row
      // carrying an older Supabase hostname, whose object lives in a different
      // project. There is nothing here to delete, so stop re-examining it.
      unresolvableRowIds.push(row.id)
      continue
    }

    if (!SWEEPABLE_BUCKETS.has(ref.bucket)) {
      // A bucket this job does not own. Never delete from it.
      console.warn(`storage-cleanup: refusing to touch bucket "${ref.bucket}"`)
      unresolvableRowIds.push(row.id)
      continue
    }

    const objectKey = `${ref.bucket}/${ref.path}`
    resolvedRowIds.push(row.id)

    // Two distinct URLs can resolve to one object (query strings are stripped),
    // so only queue each path once for removal.
    if (rowIdByObject.has(objectKey)) continue
    rowIdByObject.set(objectKey, row.id)

    const existing = pathsByBucket.get(ref.bucket)
    if (existing) existing.push(ref.path)
    else pathsByBucket.set(ref.bucket, [ref.path])
  }

  let deleted = 0
  const failedRowIds: string[] = []

  for (const [bucket, paths] of pathsByBucket) {
    const { data: removed, error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths)

    if (removeError) {
      console.error(`storage-cleanup: remove failed for ${bucket}:`, removeError)
      for (const path of paths) {
        const rowId = rowIdByObject.get(`${bucket}/${path}`)
        if (rowId) failedRowIds.push(rowId)
      }
      continue
    }

    // Supabase returns the objects it actually removed. Anything it did not
    // report is left queued rather than assumed gone, so a partial failure is
    // retried instead of being silently forgotten.
    const removedPaths = new Set((removed ?? []).map(object => object.name))
    for (const path of paths) {
      const rowId = rowIdByObject.get(`${bucket}/${path}`)
      if (!rowId) continue
      if (removedPaths.has(path)) deleted += 1
      else failedRowIds.push(rowId)
    }
  }

  // Clear everything that is settled: deleted, restored, or not ours to delete.
  const failedRowIdSet = new Set(failedRowIds)
  const settledRowIds = [
    ...resolvedRowIds.filter(id => !failedRowIdSet.has(id)),
    ...stillReferencedRowIds,
    ...unresolvableRowIds
  ]

  if (settledRowIds.length > 0) {
    const { error } = await supabaseAdmin
      .from('storage_cleanup_queue')
      .delete()
      .in('id', settledRowIds)
    if (error) console.error('storage-cleanup: could not clear settled rows:', error)
  }

  // Record failures so a persistently stuck object is visible rather than silent.
  for (const rowId of failedRowIds) {
    const row = queued.find(candidate => candidate.id === rowId)
    const { error } = await supabaseAdmin
      .from('storage_cleanup_queue')
      .update({ attempts: (row?.attempts ?? 0) + 1, last_error: 'Storage remove did not confirm deletion' })
      .eq('id', rowId)
    if (error) console.error('storage-cleanup: could not record a failure:', error)
  }

  return NextResponse.json({
    examined: queued.length,
    deleted,
    stillReferenced: stillReferencedRowIds.length,
    unresolvable: unresolvableRowIds.length,
    failed: failedRowIds.length
  })
}

import { supabase } from '@/lib/supabase'
import { deleteUploadedImages, uploadImageFile } from '@/lib/upload-image'
import { fetchWeatherForApiary } from '@/lib/apiary-weather'
import { withTimeout } from '@/lib/with-timeout'
import { getLocalDb } from './local-db'

/**
 * New inspections on their way to the server. Each is written here first and removed only once it
 * has fully arrived, so a lost signal, a closed app or a dead battery can't lose one.
 *
 * Safe to send twice: the row's id is chosen here, so a repeat is refused as a duplicate and counts
 * as arrived. Progress is recorded after each step, so a retry resumes where the last one stopped.
 *
 * Only a definite refusal from the server counts as failed, and that stays on the list until the
 * beekeeper decides. Anything uncertain stays queued: losing an inspection is worse than retrying.
 *
 * Nothing here runs in the background once the app closes, as iOS has no Background Sync. Sending
 * resumes when the app next opens or the signal returns.
 */

export interface QueuedInspection {
  id: string
  userId: string
  queuedAt: number
  hiveId: string
  hiveLabel: string
  apiaryId: string | null
  row: Record<string, unknown>
  photos: File[]
  uploadedUrls: string[]
  /** Change to the hive's super count, cleared to 0 once applied. */
  superDelta: number
  tasks: Record<string, unknown>[]
  rowSaved: boolean
  failedReason: string | null
}

export type SendResult =
  | { status: 'sent'; warnings: string[] }
  | { status: 'waiting' }
  | { status: 'rejected'; reason: string }

export const OUTBOX_CHANGED_EVENT = 'hivecraic:outbox-changed'

const PHOTO_TIMEOUT_MS = 60_000
const WEATHER_TIMEOUT_MS = 5_000
const SAVE_TIMEOUT_MS = 20_000
const DISCARD_WAIT_MS = 5_000
// Today's weather is not the weather at the hive, so a late send records none.
const WEATHER_MAX_AGE_MS = 2 * 60 * 60 * 1000
const SUPER_DELTA_MAX = 100
const TIMED_OUT = 'timed-out'

export function isConnectionFailure(message: string): boolean {
  return /abort|timeout|timed out|failed to fetch|load failed|network/i.test(message)
}

/**
 * True only for a definite refusal: a constraint, a permission, invalid data. A lost connection, an
 * expired session (it refreshes when the signal returns) or a server under strain may all succeed
 * on a later try, and so may anything not recognised.
 */
function isRefusal(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  if (isConnectionFailure(error.message ?? '')) return false
  const code = error.code ?? ''
  if (/^PGRST[12]/.test(code)) return true
  if (code.startsWith('PGRST')) return false
  // Connection (08), resources (53), operator intervention such as timeouts (57).
  if (/^(08|53|57)/.test(code)) return false
  return /^[0-9A-Z]{5}$/.test(code)
}

function announceChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT))
}

function recordProgress(id: string, changes: Partial<QueuedInspection>) {
  return getLocalDb().inspectionOutbox.update(id, changes).catch(() => 0)
}

async function removeEntry(id: string) {
  try {
    await getLocalDb().inspectionOutbox.delete(id)
  } catch {
    // Storage unavailable: a later send of this entry is refused as a duplicate and tidied then.
  }
}

async function refuse(entry: QueuedInspection, reason: string): Promise<SendResult> {
  await recordProgress(entry.id, { failedReason: reason })
  return { status: 'rejected', reason }
}

async function uploadRemainingPhotos(entry: QueuedInspection): Promise<SendResult | null> {
  const uploadedUrls = [...entry.uploadedUrls]
  for (const file of entry.photos.slice(uploadedUrls.length)) {
    let problem: string | null = null
    const upload = uploadImageFile(file, { folder: 'inspections', onError: (message) => { problem = message } })
    const url = await withTimeout(upload, PHOTO_TIMEOUT_MS, TIMED_OUT)
    if (url === TIMED_OUT) {
      // It may still arrive after giving up, and nothing would ever point at it.
      void upload.then((lateUrl) => { if (lateUrl) void deleteUploadedImages([lateUrl]) })
      return { status: 'waiting' }
    }
    if (!url) {
      const message: string = problem ?? ''
      if (navigator.onLine === false || !message || isConnectionFailure(message) || message.includes('Unknown error')) {
        return { status: 'waiting' }
      }
      return refuse(entry, `A photo could not be saved: ${message}`)
    }
    uploadedUrls.push(url)
    entry.uploadedUrls = uploadedUrls
    await recordProgress(entry.id, { uploadedUrls })
  }
  return null
}

async function saveRow(entry: QueuedInspection): Promise<SendResult | null> {
  const recent = Date.now() - entry.queuedAt < WEATHER_MAX_AGE_MS
  const weather = recent && entry.apiaryId
    ? await withTimeout(fetchWeatherForApiary(entry.apiaryId).catch(() => null), WEATHER_TIMEOUT_MS, null)
    : null

  const { error } = await supabase
    .from('inspections')
    .insert([{
      ...entry.row,
      id: entry.id,
      user_id: entry.userId,
      image_urls: [...((entry.row.image_urls as string[] | undefined) ?? []), ...entry.uploadedUrls],
      weather_temp: weather?.temp ?? null,
      weather_condition: weather?.condition ?? null,
      weather_humidity: weather?.humidity ?? null,
      weather_wind_speed: weather?.wind_speed ?? null,
    }])
    .abortSignal(AbortSignal.timeout(SAVE_TIMEOUT_MS))

  // 23505: this id is already there, so an earlier try arrived and only its answer was lost.
  if (error && error.code !== '23505') {
    if (isRefusal(error)) return refuse(entry, error.message)
    return { status: 'waiting' }
  }
  entry.rowSaved = true
  await recordProgress(entry.id, { rowSaved: true })
  return null
}

async function applySuperChange(entry: QueuedInspection, warnings: string[]): Promise<SendResult | null> {
  const delta = entry.superDelta
  if (delta === 0) return null
  // Clearly offline means it was never attempted, so it can wait. Once attempted it is never
  // repeated: this change adds to the count, and a lost answer doesn't mean it failed. A count
  // that is one change short, with a warning, is better than one silently counted twice.
  if (navigator.onLine === false) return { status: 'waiting' }
  if (Number.isInteger(delta) && Math.abs(delta) <= SUPER_DELTA_MAX) {
    // Marked done before the call, in memory as well as on the device: an attempt that was never
    // stored (and so is retried from memory) must not repeat the change either.
    entry.superDelta = 0
    await recordProgress(entry.id, { superDelta: 0 })
    const { error } = await supabase
      .rpc('adjust_hive_honey_supers', { p_hive_id: entry.hiveId, p_delta: delta })
      .abortSignal(AbortSignal.timeout(SAVE_TIMEOUT_MS))
    if (error) {
      console.error('Hive super sync failed:', error)
      warnings.push(`Inspection saved. The super count on hive ${entry.hiveLabel} may not have updated, so please check it.`)
    }
  } else {
    warnings.push(`Inspection saved. The super count on hive ${entry.hiveLabel} was not updated, as the change was out of range.`)
  }
  entry.superDelta = 0
  await recordProgress(entry.id, { superDelta: 0 })
  return null
}

async function saveTasks(entry: QueuedInspection, warnings: string[]): Promise<SendResult | null> {
  if (entry.tasks.length === 0) return null
  const { error } = await supabase
    .from('tasks_events')
    .insert(entry.tasks)
    .abortSignal(AbortSignal.timeout(SAVE_TIMEOUT_MS))
  if (!error || error.code === '23505') return null
  if (!isRefusal(error)) return { status: 'waiting' }
  console.error('Follow-up task insert failed:', error)
  warnings.push(`Inspection saved, but ${entry.tasks.length} follow-up task(s) could not be created. Open Tasks to add them.`)
  return null
}

async function sendSteps(given: QueuedInspection, kept: boolean): Promise<SendResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'waiting' }
  const warnings: string[] = []
  try {
    // What is stored, never a copy held on screen: another tab may have made progress, and a stale
    // copy would repeat its steps. Gone means another tab finished it.
    const stored = kept ? await getLocalDb().inspectionOutbox.get(given.id) : given
    if (!stored) return { status: 'sent', warnings }
    const entry = stored

    if (!entry.rowSaved) {
      const stopped = await uploadRemainingPhotos(entry) ?? await saveRow(entry)
      if (stopped) return stopped
    }
    const stopped = await applySuperChange(entry, warnings) ?? await saveTasks(entry, warnings)
    if (stopped) return stopped
  } catch (error) {
    console.error('Sending an inspection failed:', error)
    return { status: 'waiting' }
  }
  await removeEntry(given.id)
  return { status: 'sent', warnings }
}

const inFlight = new Map<string, Promise<SendResult>>()

/**
 * Sends one inspection. A send already running in this tab is shared; in another tab, left to it.
 * `kept` is false only when it could not be stored, so there is nothing to read back.
 */
export function sendQueuedInspection(entry: QueuedInspection, kept = true): Promise<SendResult> {
  const running = inFlight.get(entry.id)
  if (running) return running

  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  const attempt: Promise<SendResult> = locks
    ? locks.request(`hivecraic-outbox-${entry.id}`, { ifAvailable: true }, (lock) =>
        lock ? sendSteps(entry, kept) : { status: 'waiting' as const }) as Promise<SendResult>
    : sendSteps(entry, kept)
  const send = attempt.finally(() => {
    inFlight.delete(entry.id)
    announceChange()
  })
  inFlight.set(entry.id, send)
  return send
}

/** False if it could not be kept on this device, so it must not be treated as safe. */
export async function queueInspection(entry: QueuedInspection): Promise<boolean> {
  try {
    await getLocalDb().inspectionOutbox.put(entry)
    announceChange()
    return true
  } catch (error) {
    console.error('Could not keep the inspection on this device:', error)
    return false
  }
}

export async function listQueuedInspections(userId: string): Promise<QueuedInspection[]> {
  try {
    const entries = await getLocalDb().inspectionOutbox.where('userId').equals(userId).toArray()
    return entries.sort((a, b) => a.queuedAt - b.queuedAt)
  } catch {
    return []
  }
}

/**
 * Sends everything waiting, oldest first, stopping at the first that can't get through: the rest
 * would only wait out the same dead signal. Entries the server refused wait for the beekeeper.
 */
export async function flushQueuedInspections(userId: string): Promise<{ sent: number; refused: number; warnings: string[] }> {
  const totals = { sent: 0, refused: 0, warnings: [] as string[] }
  for (const entry of await listQueuedInspections(userId)) {
    if (entry.failedReason) continue
    const result = await sendQueuedInspection(entry)
    if (result.status === 'waiting') break
    if (result.status === 'sent') {
      totals.sent += 1
      totals.warnings.push(...result.warnings)
    } else {
      totals.refused += 1
    }
  }
  return totals
}

export async function retryQueuedInspection(entry: QueuedInspection): Promise<SendResult> {
  await recordProgress(entry.id, { failedReason: null })
  return sendQueuedInspection(entry)
}

/** Photos already uploaded go too, as nothing else will ever point at them. */
export async function discardQueuedInspection(given: QueuedInspection): Promise<void> {
  // A send under way could still deliver it after this, so let it finish first. Not for long,
  // though: a log-out shouldn't hang on a bad signal.
  const running = inFlight.get(given.id)
  if (running) await withTimeout<SendResult | null>(running, DISCARD_WAIT_MS, null)

  let entry = given
  try {
    entry = await getLocalDb().inspectionOutbox.get(given.id) ?? given
  } catch {
    // Storage unavailable: work from what was passed in.
  }
  await removeEntry(given.id)
  if (!entry.rowSaved && entry.uploadedUrls.length > 0) {
    await deleteUploadedImages(entry.uploadedUrls).catch(() => {})
  }
  announceChange()
}

/** For a deliberate log-out. An expired session keeps them, as with drafts. */
export async function discardAllQueuedInspections(userId: string): Promise<void> {
  for (const entry of await listQueuedInspections(userId)) {
    await discardQueuedInspection(entry)
  }
}

/** For a password reset or a deleted account. */
export async function clearInspectionOutbox(): Promise<void> {
  try {
    await getLocalDb().inspectionOutbox.clear()
    announceChange()
  } catch (error) {
    console.error('Could not clear the inspection outbox:', error)
  }
}

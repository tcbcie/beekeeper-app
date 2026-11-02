import { getLocalDb } from './local-db'
import { IMPERSONATION_KEY } from './impersonation-key'

/**
 * The last data each screen showed, so returning to it is instant, on any signal, while fresh data
 * loads behind it. A convenience only: every screen still fetches on every visit, and nothing is
 * ever written back from here. Nothing in this file throws.
 *
 * Kept in memory for instant moves between tabs, and on the device for a cold start in a field.
 */

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

// A new build may change what a screen stores, so anything from an earlier one is ignored.
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

export interface CachedScreen<T> {
  data: T
  savedAt: number
}

const memory = new Map<string, CachedScreen<unknown>>()

// Raised on every clear, so a load that started before a sign-out can't write afterwards.
let generation = 0

function isImpersonating(): boolean {
  try {
    return Boolean(localStorage.getItem(IMPERSONATION_KEY))
  } catch {
    return false
  }
}

/** One screen's cache for one user. Open it when a load starts. */
export function openScreenCache<T>(userId: string, screen: string) {
  const key = `${userId}:${screen}`
  const openedIn = generation

  return {
    async read(): Promise<CachedScreen<T> | null> {
      const inMemory = memory.get(key)
      if (inMemory) return inMemory as CachedScreen<T>
      try {
        const row = await getLocalDb().screenCache.get(key)
        if (!row || row.build !== BUILD || Date.now() - row.savedAt > MAX_AGE_MS) return null
        if (openedIn !== generation) return null
        const entry = { data: row.data as T, savedAt: row.savedAt }
        memory.set(key, entry)
        return entry
      } catch {
        return null
      }
    },

    save(data: T): void {
      if (openedIn !== generation) return
      const savedAt = Date.now()
      memory.set(key, { data, savedAt })
      // Someone else's records shouldn't stay on an admin's device after a support session.
      if (isImpersonating()) return
      try {
        getLocalDb().screenCache.put({ key, build: BUILD, savedAt, data }).catch(() => {})
      } catch {
        // Storage full or blocked: the screen simply loads as it always did.
      }
    },

    /** The record is gone or no longer shared, so no copy of it may be shown again. */
    forget(): void {
      memory.delete(key)
      try {
        getLocalDb().screenCache.delete(key).catch(() => {})
      } catch {
        // Storage unavailable: nothing was kept.
      }
    },
  }
}

export function clearScreenCache(): void {
  generation += 1
  memory.clear()
  try {
    getLocalDb().screenCache.clear().catch(() => {})
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

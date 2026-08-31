import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { updateManager } from '@/lib/update-manager'

/**
 * The service worker calls clients.claim() on activate, so `controllerchange`
 * fires in EVERY open client, not only the one that pressed Update. Without a
 * guard, a second tab holding a half-finished inspection is reloaded having
 * never seen the prompt.
 *
 * These exercise the guard directly rather than through initialize(), because
 * the manager is a module-level singleton whose `initialized` flag is never
 * reset — the reason the existing update-manager tests fail for unrelated
 * reasons.
 */

const DISMISS_KEY = 'pwa-update-dismissed'

let reload: ReturnType<typeof vi.fn>

beforeEach(() => {
  reload = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('unsaved-work guards', () => {
  it('reloads when nothing reports unsaved work', () => {
    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()
  })

  it('registers and removes a guard', () => {
    const unregister = updateManager.registerUnsavedWorkGuard(() => false)
    expect(typeof unregister).toBe('function')
    unregister()
  })

  it('holds a deferred reload back while work is at risk', () => {
    const unregister = updateManager.registerUnsavedWorkGuard(() => true)

    // Simulate a controllerchange that arrived while the form was dirty.
    ;(updateManager as unknown as { reloadPending: boolean }).reloadPending = true
    updateManager.flushPendingReload()

    expect(reload).not.toHaveBeenCalled()
    unregister()
  })

  it('runs the deferred reload once the work is saved', () => {
    let dirty = true
    const unregister = updateManager.registerUnsavedWorkGuard(() => dirty)
    ;(updateManager as unknown as { reloadPending: boolean }).reloadPending = true

    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()

    dirty = false
    updateManager.flushPendingReload()
    expect(reload).toHaveBeenCalledTimes(1)

    unregister()
  })

  it('runs the deferred reload when the last guard unregisters', () => {
    const unregister = updateManager.registerUnsavedWorkGuard(() => true)
    ;(updateManager as unknown as { reloadPending: boolean }).reloadPending = true

    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()

    // Navigating away from the form removes its guard.
    unregister()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('treats a throwing guard as unsaved work rather than authorising loss', () => {
    const unregister = updateManager.registerUnsavedWorkGuard(() => {
      throw new Error('guard blew up')
    })
    ;(updateManager as unknown as { reloadPending: boolean }).reloadPending = true

    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()

    unregister()
  })

  it('holds back if any one of several guards reports work', () => {
    const clean = updateManager.registerUnsavedWorkGuard(() => false)
    const dirty = updateManager.registerUnsavedWorkGuard(() => true)
    ;(updateManager as unknown as { reloadPending: boolean }).reloadPending = true

    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()

    dirty()
    expect(reload).toHaveBeenCalledTimes(1)
    clean()
  })

  it('does not reload when nothing was pending', () => {
    const unregister = updateManager.registerUnsavedWorkGuard(() => false)
    updateManager.flushPendingReload()
    expect(reload).not.toHaveBeenCalled()
    unregister()
  })
})

describe('dismissal cooldown', () => {
  it('records a dismissal so "Later" survives a page load', () => {
    updateManager.dismissUpdate()
    expect(localStorage.getItem(DISMISS_KEY)).toBeTruthy()
    expect(updateManager.isDismissalActive()).toBe(true)
  })

  it('reports no active dismissal when none was recorded', () => {
    expect(updateManager.isDismissalActive()).toBe(false)
  })

  it('expires the cooldown so an update is not hidden indefinitely', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    localStorage.setItem(DISMISS_KEY, String(twoHoursAgo))
    expect(updateManager.isDismissalActive()).toBe(false)
  })

  it('ignores a corrupt stored value rather than suppressing forever', () => {
    localStorage.setItem(DISMISS_KEY, 'not-a-timestamp')
    expect(updateManager.isDismissalActive()).toBe(false)
  })

  it('ignores a future timestamp from a clock change', () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 60 * 60 * 1000))
    expect(updateManager.isDismissalActive()).toBe(false)
  })
})

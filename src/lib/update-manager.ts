// PWA Update Manager
// Handles service worker updates with user notifications and controlled update flow

export type UpdateStatus = 'checking' | 'available' | 'installing' | 'ready' | 'no-update' | 'error'

export interface UpdateState {
  status: UpdateStatus
  newVersion?: string
  currentVersion?: string
  error?: string
}

export type UpdateListener = (state: UpdateState) => void

const UPDATE_DISMISSED_KEY = 'pwa-update-dismissed'
/** Short by design: an update may carry a fix the user needs. */
const UPDATE_DISMISSED_COOLDOWN_MS = 60 * 60 * 1000

class UpdateManager {
  private registration: ServiceWorkerRegistration | null = null
  private listeners: Set<UpdateListener> = new Set()
  private waitingWorker: ServiceWorker | null = null
  private currentState: UpdateState = { status: 'no-update' }
  private initialized = false
  private updateCheckInterval: ReturnType<typeof setInterval> | null = null
  private noUpdateTimeout: ReturnType<typeof setTimeout> | null = null
  private visibilityHandler: (() => void) | null = null
  private controllerChangeHandler: (() => void) | null = null
  /** Predicates that veto a reload while they report unsaved work. */
  private unsavedWorkGuards: Set<() => boolean> = new Set()
  /** A reload that arrived while work was at risk, waiting to be run. */
  private reloadPending = false

  /**
   * Initialize the update manager with service worker registration
   */
  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    this.registration = registration

    // Check for waiting service worker (update already downloaded).
    // The reference is kept either way so an explicit check can still apply it,
    // but a recent dismissal suppresses the prompt. This is the exact path that
    // made "Later" meaningless: the worker is still waiting after a reload, so
    // the prompt reappeared immediately. A genuinely new update arrives through
    // the updatefound listener below and is not suppressed.
    if (registration.waiting) {
      this.waitingWorker = registration.waiting
      if (!this.isDismissalActive()) {
        this.updateState({ status: 'ready' })
      }
    }

    // Listen for new service worker installing
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      this.updateState({ status: 'installing' })

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is installed and ready
          this.waitingWorker = newWorker
          this.updateState({ status: 'ready' })
        }
      })
    })

    // Listen for controller change (new service worker activated).
    //
    // This fires in EVERY open client, not just the one that pressed Update,
    // because the service worker calls clients.claim() on activate. A second
    // tab holding a half-finished inspection would therefore be reloaded
    // without ever having seen the prompt. The guard has to live here, in the
    // handler every client runs, rather than on the Update button.
    //
    // The reload is not cancelled, only deferred: once the work is saved or
    // discarded, hasUnsavedWork() returns false and the pending reload runs.
    this.controllerChangeHandler = () => {
      if (this.hasUnsavedWork()) {
        this.reloadPending = true
        return
      }
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', this.controllerChangeHandler)

    // Check for updates periodically (every 30 minutes)
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates()
    }, 30 * 60 * 1000)

    // Check for updates on page visibility change
    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.checkForUpdates()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      console.warn('Update manager not initialized')
      return
    }

    try {
      this.updateState({ status: 'checking' })
      await this.registration.update()

      // An explicit check must surface a worker that is already waiting, even
      // while a dismissal cooldown is suppressing the passive prompt.
      // Otherwise the user asks "are there updates?" and is told no while one
      // sits ready to install, which the cooldown made reachable across
      // reloads. Asking directly overrides having said "later" earlier.
      if (this.registration.waiting) {
        this.waitingWorker = this.registration.waiting
        this.updateState({ status: 'ready' })
        return
      }

      // Repeated checks previously overwrote this handle without clearing it,
      // leaving orphaned timers that could demote a later 'ready' state.
      if (this.noUpdateTimeout) clearTimeout(this.noUpdateTimeout)

      // If no update was found, the state will remain 'checking'
      // We'll update it to 'no-update' after a brief delay
      this.noUpdateTimeout = setTimeout(() => {
        if (this.currentState.status === 'checking') {
          this.updateState({ status: 'no-update' })
        }
      }, 1000)
    } catch (error) {
      console.error('Error checking for updates:', error)
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Registers a predicate the manager consults before reloading this client.
   * Returns an unsubscribe function.
   */
  registerUnsavedWorkGuard(guard: () => boolean): () => void {
    this.unsavedWorkGuards.add(guard)
    return () => {
      this.unsavedWorkGuards.delete(guard)
      // Removing the last guard can be what makes a deferred reload safe.
      this.flushPendingReload()
    }
  }

  /** True when any registered guard reports work that would be lost. */
  private hasUnsavedWork(): boolean {
    for (const guard of this.unsavedWorkGuards) {
      try {
        if (guard()) return true
      } catch {
        // A broken guard must not silently authorise data loss.
        return true
      }
    }
    return false
  }

  /** Runs a reload that was deferred, once nothing is at risk. */
  flushPendingReload(): void {
    if (this.reloadPending && !this.hasUnsavedWork()) {
      this.reloadPending = false
      window.location.reload()
    }
  }

  /**
   * Apply the pending update (activate waiting service worker).
   * Returns true when the resulting reload will be deferred because work is
   * unsaved, so the caller can explain the delay.
   */
  applyUpdate(): boolean {
    if (!this.waitingWorker) {
      console.warn('No waiting service worker to activate')
      return false
    }

    // Send message to waiting service worker to skip waiting
    this.waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Reported so the UI can say the update is queued. The reload happens on
    // controllerchange and will be held back if work is unsaved, so without
    // this the banner just disappears and nothing observable happens.
    return this.hasUnsavedWork()
  }

  /**
   * Dismiss the update (user chose not to update now)
   */
  dismissUpdate(): void {
    // Persisted, so "Later" survives a page load. Previously this was memory
    // only, and initialize() re-flagged any still-waiting worker as ready on
    // the very next load, so the prompt returned immediately. The window is
    // deliberately far shorter than the install prompt's seven days, because
    // an update may carry a fix the user needs.
    try {
      localStorage.setItem(UPDATE_DISMISSED_KEY, Date.now().toString())
    } catch {
      // Private mode or a full quota: the dialog simply reappears sooner.
    }
    this.updateState({ status: 'no-update' })
  }

  /** True while a recent dismissal should keep the prompt hidden. */
  isDismissalActive(): boolean {
    try {
      const dismissedAt = localStorage.getItem(UPDATE_DISMISSED_KEY)
      if (!dismissedAt) return false
      const elapsed = Date.now() - Number(dismissedAt)
      return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < UPDATE_DISMISSED_COOLDOWN_MS
    } catch {
      return false
    }
  }

  /**
   * Subscribe to update state changes
   */
  subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.currentState)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current update state
   */
  getState(): UpdateState {
    return this.currentState
  }

  /**
   * Clean up all event listeners and intervals
   */
  destroy(): void {
    if (this.noUpdateTimeout) {
      clearTimeout(this.noUpdateTimeout)
      this.noUpdateTimeout = null
    }
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
    if (this.controllerChangeHandler) {
      navigator.serviceWorker.removeEventListener('controllerchange', this.controllerChangeHandler)
      this.controllerChangeHandler = null
    }
    this.listeners.clear()
    this.initialized = false
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<UpdateState>): void {
    this.currentState = { ...this.currentState, ...newState }
    this.listeners.forEach(listener => listener(this.currentState))
  }
}

// Export singleton instance
export const updateManager = new UpdateManager()

/**
 * Get the app version from package.json (injected at build time)
 */
export function getAppVersion(): string {
  // This will be replaced at build time with the actual version
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.4.2'
}

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

class UpdateManager {
  private registration: ServiceWorkerRegistration | null = null
  private listeners: Set<UpdateListener> = new Set()
  private waitingWorker: ServiceWorker | null = null
  private currentState: UpdateState = { status: 'no-update' }
  private initialized = false
  private updateCheckInterval: ReturnType<typeof setInterval> | null = null
  private visibilityHandler: (() => void) | null = null
  private controllerChangeHandler: (() => void) | null = null

  /**
   * Initialize the update manager with service worker registration
   */
  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    this.registration = registration

    // Check for waiting service worker (update already downloaded)
    if (registration.waiting) {
      this.waitingWorker = registration.waiting
      this.updateState({ status: 'ready' })
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

    // Listen for controller change (new service worker activated)
    this.controllerChangeHandler = () => {
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

      // If no update was found, the state will remain 'checking'
      // We'll update it to 'no-update' after a brief delay
      setTimeout(() => {
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
   * Apply the pending update (activate waiting service worker)
   */
  applyUpdate(): void {
    if (!this.waitingWorker) {
      console.warn('No waiting service worker to activate')
      return
    }

    // Send message to waiting service worker to skip waiting
    this.waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * Dismiss the update (user chose not to update now)
   */
  dismissUpdate(): void {
    this.updateState({ status: 'no-update' })
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { updateManager, getAppVersion } from '@/lib/update-manager'

/**
 * Integration tests for the complete PWA update flow
 * Tests the interaction between service worker, update manager, and UI components
 */
describe('PWA Update Flow Integration', () => {
  let mockRegistration: any
  let mockServiceWorker: any
  let mockWaitingWorker: any
  let listeners: Map<string, Function>
  let eventListeners: Map<string, Set<Function>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    listeners = new Map()
    eventListeners = new Map()

    // Mock Service Workers
    mockServiceWorker = {
      state: 'activated',
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Set())
        }
        eventListeners.get(event)!.add(callback)
      })
    }

    mockWaitingWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Set())
        }
        eventListeners.get(event)!.add(callback)
      })
    }

    // Mock ServiceWorkerRegistration
    mockRegistration = {
      waiting: null,
      installing: null,
      active: mockServiceWorker,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Set())
        }
        eventListeners.get(event)!.add(callback)
      })
    }

    // Mock navigator.serviceWorker
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          controller: mockServiceWorker,
          ready: Promise.resolve(mockRegistration),
          addEventListener: vi.fn((event: string, callback: Function) => {
            if (!eventListeners.has(`sw-${event}`)) {
              eventListeners.set(`sw-${event}`, new Set())
            }
            eventListeners.get(`sw-${event}`)!.add(callback)
          })
        }
      },
      writable: true,
      configurable: true
    })

    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        hidden: false,
        addEventListener: vi.fn((event: string, callback: Function) => {
          if (!eventListeners.has(`doc-${event}`)) {
            eventListeners.set(`doc-${event}`, new Set())
          }
          eventListeners.get(`doc-${event}`)!.add(callback)
        })
      },
      writable: true,
      configurable: true
    })

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    listeners.clear()
    eventListeners.clear()
  })

  const triggerEvent = (eventName: string) => {
    const callbacks = eventListeners.get(eventName)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }

  describe('Complete Update Lifecycle', () => {
    it('should handle full update flow from detection to activation', async () => {
      const stateUpdates: string[] = []

      // Subscribe to update manager
      updateManager.subscribe((state) => {
        stateUpdates.push(state.status)
      })

      // Initialize update manager
      await updateManager.initialize(mockRegistration)

      expect(stateUpdates).toContain('no-update')

      // Simulate new service worker becomes available
      mockRegistration.installing = mockWaitingWorker

      // Trigger updatefound event
      const updateFoundCallbacks = eventListeners.get('updatefound')
      expect(updateFoundCallbacks).toBeDefined()
      updateFoundCallbacks!.forEach(cb => cb())

      expect(stateUpdates).toContain('installing')

      // Simulate new worker installed
      mockWaitingWorker.state = 'installed'
      const stateChangeCallbacks = eventListeners.get('statechange')
      if (stateChangeCallbacks) {
        stateChangeCallbacks.forEach(cb => cb())
      }

      expect(stateUpdates).toContain('ready')

      // User clicks "Update Now"
      updateManager.applyUpdate()

      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING'
      })

      // Service worker activates
      const controllerChangeCallbacks = eventListeners.get('sw-controllerchange')
      if (controllerChangeCallbacks) {
        controllerChangeCallbacks.forEach(cb => cb())
      }

      expect(window.location.reload).toHaveBeenCalled()
    })

    it('should detect waiting service worker on initialization', async () => {
      const stateUpdates: string[] = []

      // Set up waiting service worker before initialization
      mockRegistration.waiting = mockWaitingWorker

      updateManager.subscribe((state) => {
        stateUpdates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)

      // Should immediately detect ready update
      expect(stateUpdates).toContain('ready')
    })

    it('should handle user dismissing update', async () => {
      const stateUpdates: string[] = []

      updateManager.subscribe((state) => {
        stateUpdates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)

      // Simulate update ready
      mockRegistration.waiting = mockWaitingWorker
      mockRegistration.installing = mockWaitingWorker

      const updateFoundCallbacks = eventListeners.get('updatefound')
      updateFoundCallbacks?.forEach(cb => cb())

      mockWaitingWorker.state = 'installed'
      const stateChangeCallbacks = eventListeners.get('statechange')
      stateChangeCallbacks?.forEach(cb => cb())

      expect(stateUpdates).toContain('ready')

      // User clicks "Later"
      updateManager.dismissUpdate()

      expect(stateUpdates[stateUpdates.length - 1]).toBe('no-update')

      // Service worker should NOT be activated
      expect(mockWaitingWorker.postMessage).not.toHaveBeenCalled()
      expect(window.location.reload).not.toHaveBeenCalled()
    })
  })

  describe('Periodic Update Checks', () => {
    it('should check for updates every 30 minutes', async () => {
      await updateManager.initialize(mockRegistration)

      expect(mockRegistration.update).toHaveBeenCalledTimes(0)

      // Fast-forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000)

      expect(mockRegistration.update).toHaveBeenCalledTimes(1)

      // Fast-forward another 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000)

      expect(mockRegistration.update).toHaveBeenCalledTimes(2)
    })

    it('should check for updates when page becomes visible', async () => {
      await updateManager.initialize(mockRegistration)

      mockRegistration.update.mockClear()

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true })

      // Simulate page becoming visible again
      Object.defineProperty(document, 'hidden', { value: false, writable: true })

      const visibilityCallbacks = eventListeners.get('doc-visibilitychange')
      visibilityCallbacks?.forEach(cb => cb())

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should not check for updates when page becomes hidden', async () => {
      await updateManager.initialize(mockRegistration)

      mockRegistration.update.mockClear()

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true })

      const visibilityCallbacks = eventListeners.get('doc-visibilitychange')
      visibilityCallbacks?.forEach(cb => cb())

      expect(mockRegistration.update).not.toHaveBeenCalled()
    })
  })

  describe('Manual Update Check', () => {
    it('should allow manual update check', async () => {
      await updateManager.initialize(mockRegistration)

      mockRegistration.update.mockClear()

      await updateManager.checkForUpdates()

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should update state during manual check', async () => {
      const stateUpdates: string[] = []

      updateManager.subscribe((state) => {
        stateUpdates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)

      stateUpdates.length = 0 // Clear initial states

      await updateManager.checkForUpdates()

      expect(stateUpdates).toContain('checking')
    })
  })

  describe('Error Handling', () => {
    it('should handle update check failures gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const stateUpdates: string[] = []

      mockRegistration.update.mockRejectedValue(new Error('Network error'))

      updateManager.subscribe((state) => {
        stateUpdates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)

      await updateManager.checkForUpdates()

      expect(stateUpdates).toContain('error')
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing waiting service worker gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await updateManager.initialize(mockRegistration)

      // Try to apply update when no waiting worker
      updateManager.applyUpdate()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No waiting service worker to activate'
      )
      expect(window.location.reload).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Multiple Subscribers', () => {
    it('should notify all subscribers of state changes', async () => {
      const subscriber1Updates: string[] = []
      const subscriber2Updates: string[] = []
      const subscriber3Updates: string[] = []

      updateManager.subscribe((state) => {
        subscriber1Updates.push(state.status)
      })

      updateManager.subscribe((state) => {
        subscriber2Updates.push(state.status)
      })

      updateManager.subscribe((state) => {
        subscriber3Updates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)
      await updateManager.checkForUpdates()

      // All subscribers should receive the same updates
      expect(subscriber1Updates).toContain('checking')
      expect(subscriber2Updates).toContain('checking')
      expect(subscriber3Updates).toContain('checking')
    })

    it('should allow subscribers to unsubscribe', async () => {
      const subscriber1Updates: string[] = []
      const subscriber2Updates: string[] = []

      updateManager.subscribe((state) => {
        subscriber1Updates.push(state.status)
      })

      const unsubscribe2 = updateManager.subscribe((state) => {
        subscriber2Updates.push(state.status)
      })

      await updateManager.initialize(mockRegistration)

      // Clear arrays
      subscriber1Updates.length = 0
      subscriber2Updates.length = 0

      // Unsubscribe second subscriber
      unsubscribe2()

      await updateManager.checkForUpdates()

      // Only first subscriber should receive updates
      expect(subscriber1Updates.length).toBeGreaterThan(0)
      expect(subscriber2Updates.length).toBe(0)
    })
  })

  describe('Version Management', () => {
    it('should get version from environment variable', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION
      process.env.NEXT_PUBLIC_APP_VERSION = '2.0.0'

      const version = getAppVersion()

      expect(version).toBe('2.0.0')

      process.env.NEXT_PUBLIC_APP_VERSION = originalEnv
    })

    it('should fallback to default version when env var not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION
      delete process.env.NEXT_PUBLIC_APP_VERSION

      const version = getAppVersion()

      expect(version).toBe('1.4.2')

      process.env.NEXT_PUBLIC_APP_VERSION = originalEnv
    })
  })
})

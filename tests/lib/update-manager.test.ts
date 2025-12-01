import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { updateManager, getAppVersion, type UpdateState } from '@/lib/update-manager'

describe('Update Manager', () => {
  let mockRegistration: any
  let mockServiceWorker: any
  let listeners: Map<string, Function>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    listeners = new Map()

    // Mock ServiceWorker
    mockServiceWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        listeners.set(event, callback)
      })
    }

    // Mock ServiceWorkerRegistration
    mockRegistration = {
      waiting: null,
      installing: null,
      active: mockServiceWorker,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((event: string, callback: Function) => {
        listeners.set(event, callback)
      })
    }

    // Mock navigator.serviceWorker
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          controller: mockServiceWorker,
          addEventListener: vi.fn((event: string, callback: Function) => {
            listeners.set(`sw-${event}`, callback)
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
          listeners.set(`doc-${event}`, callback)
        })
      },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    listeners.clear()
  })

  describe('initialize', () => {
    it('should initialize with service worker registration', async () => {
      await updateManager.initialize(mockRegistration)

      expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      )
    })

    it('should detect waiting service worker immediately', async () => {
      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      mockRegistration.waiting = mockServiceWorker

      await updateManager.initialize(mockRegistration)

      // Should notify subscriber about ready update
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      )
    })

    it('should set up periodic update checks', async () => {
      await updateManager.initialize(mockRegistration)

      // Fast-forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000)

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should check for updates on visibility change', async () => {
      await updateManager.initialize(mockRegistration)

      const visibilityCallback = listeners.get('doc-visibilitychange')
      expect(visibilityCallback).toBeDefined()

      // Simulate visibility change
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      visibilityCallback!()

      expect(mockRegistration.update).toHaveBeenCalled()
    })
  })

  describe('checkForUpdates', () => {
    it('should update state to checking', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      await updateManager.checkForUpdates()

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'checking' })
      )
    })

    it('should call registration.update()', async () => {
      await updateManager.initialize(mockRegistration)

      await updateManager.checkForUpdates()

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should update state to no-update after timeout if no update found', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      await updateManager.checkForUpdates()

      // Fast-forward past the timeout
      vi.advanceTimersByTime(1500)

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'no-update' })
      )
    })

    it('should handle update check errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockRegistration.update.mockRejectedValue(new Error('Update failed'))

      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      await updateManager.checkForUpdates()

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error: 'Update failed'
        })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should not check for updates if not initialized', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Reset the update manager by setting registration to null
      // @ts-expect-error - accessing private field for testing
      updateManager['registration'] = null

      await updateManager.checkForUpdates()

      expect(consoleWarnSpy).toHaveBeenCalledWith('Update manager not initialized')
      expect(mockRegistration.update).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('applyUpdate', () => {
    it('should send SKIP_WAITING message to waiting service worker', async () => {
      mockRegistration.waiting = mockServiceWorker

      await updateManager.initialize(mockRegistration)

      updateManager.applyUpdate()

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING'
      })
    })

    it('should warn if no waiting service worker', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await updateManager.initialize(mockRegistration)

      // Reset waiting worker to null
      // @ts-expect-error - accessing private field for testing
      updateManager['waitingWorker'] = null

      updateManager.applyUpdate()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No waiting service worker to activate'
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('dismissUpdate', () => {
    it('should update state to no-update', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      updateManager.dismissUpdate()

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'no-update' })
      )
    })
  })

  describe('subscribe', () => {
    it('should call listener immediately with current state', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.any(String) })
      )
    })

    it('should call listener on state updates', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      subscriber.mockClear()

      await updateManager.checkForUpdates()

      expect(subscriber).toHaveBeenCalled()
    })

    it('should return unsubscribe function', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      const unsubscribe = updateManager.subscribe(subscriber)

      subscriber.mockClear()

      unsubscribe()

      await updateManager.checkForUpdates()

      // Should not be called after unsubscribe
      expect(subscriber).not.toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('should return current state', async () => {
      await updateManager.initialize(mockRegistration)

      const state = updateManager.getState()

      expect(state).toHaveProperty('status')
    })
  })

  describe('updatefound event handling', () => {
    it('should update state to installing when new worker is installing', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      // Simulate updatefound event
      mockRegistration.installing = mockServiceWorker
      const updateFoundCallback = listeners.get('updatefound')
      expect(updateFoundCallback).toBeDefined()

      updateFoundCallback!()

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'installing' })
      )
    })

    it('should update state to ready when new worker is installed', async () => {
      await updateManager.initialize(mockRegistration)

      const subscriber = vi.fn()
      updateManager.subscribe(subscriber)

      // Simulate updatefound event
      mockRegistration.installing = mockServiceWorker
      const updateFoundCallback = listeners.get('updatefound')
      updateFoundCallback!()

      // Simulate statechange to installed
      const stateChangeCallback = listeners.get('statechange')
      expect(stateChangeCallback).toBeDefined()

      mockServiceWorker.state = 'installed'
      stateChangeCallback!()

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      )
    })
  })

  describe('controllerchange event handling', () => {
    it('should reload page when controller changes', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
        configurable: true
      })

      await updateManager.initialize(mockRegistration)

      // Simulate controllerchange event
      const controllerChangeCallback = listeners.get('sw-controllerchange')
      expect(controllerChangeCallback).toBeDefined()

      controllerChangeCallback!()

      expect(reloadMock).toHaveBeenCalled()
    })
  })
})

describe('getAppVersion', () => {
  it('should return app version from environment', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION
    process.env.NEXT_PUBLIC_APP_VERSION = '1.2.3'

    const version = getAppVersion()

    expect(version).toBe('1.2.3')

    process.env.NEXT_PUBLIC_APP_VERSION = originalEnv
  })

  it('should return default version if env var not set', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION
    delete process.env.NEXT_PUBLIC_APP_VERSION

    const version = getAppVersion()

    expect(version).toBe('1.4.2')

    process.env.NEXT_PUBLIC_APP_VERSION = originalEnv
  })
})

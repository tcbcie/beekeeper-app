import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  registerServiceWorker,
  requestNotificationPermission,
  showNotification,
  scheduleNotification,
  scheduleBatchNotifications,
  initializeNotifications,
  type NotificationData,
  type BatchDates
} from '@/lib/notifications'

describe('Notification Utilities', () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Spy on setTimeout
    setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    // Default Notification API mock
    global.Notification = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted')
    } as unknown as typeof Notification
  })

  afterEach(() => {
    vi.useRealTimers()
    setTimeoutSpy.mockRestore()
    // Clean up Notification mock
    delete (global as { Notification?: unknown }).Notification
  })

  describe('registerServiceWorker', () => {
    it('should return null if service workers are not supported', async () => {
      const originalNavigator = global.navigator
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      })

      const result = await registerServiceWorker()
      expect(result).toBeNull()

      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      })
    })

    it('should attempt to register service worker when supported', async () => {
      const mockRegistration = { scope: '/', active: true }
      const mockRegister = vi.fn().mockResolvedValue(mockRegistration)

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister
          }
        },
        writable: true,
        configurable: true
      })

      const result = await registerServiceWorker()
      expect(mockRegister).toHaveBeenCalledWith('/service-worker.js', { scope: '/' })
      expect(result).toBe(mockRegistration)
    })

    it('should handle registration errors gracefully', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('Registration failed'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister
          }
        },
        writable: true,
        configurable: true
      })

      const result = await registerServiceWorker()
      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('requestNotificationPermission', () => {
    it('should return denied if notifications are not supported', async () => {
      const originalWindow = global.window
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true
      })

      const result = await requestNotificationPermission()
      expect(result).toBe('denied')

      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true
      })
    })

    it('should return granted if permission already granted', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          Notification: {
            permission: 'granted'
          }
        },
        writable: true,
        configurable: true
      })

      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
    })

    it('should request permission if not yet determined', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      const NotificationMock = {
        permission: 'default',
        requestPermission: mockRequestPermission
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: NotificationMock
        },
        writable: true,
        configurable: true
      })

      global.Notification = NotificationMock as unknown as typeof Notification

      const result = await requestNotificationPermission()
      expect(mockRequestPermission).toHaveBeenCalled()
      expect(result).toBe('granted')
    })

    it('should return denied if permission is denied', async () => {
      const NotificationMock = {
        permission: 'denied'
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: NotificationMock
        },
        writable: true,
        configurable: true
      })

      global.Notification = NotificationMock as unknown as typeof Notification

      const result = await requestNotificationPermission()
      expect(result).toBe('denied')
    })
  })

  describe('showNotification', () => {
    it('should not show notification if permission not granted', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const NotificationMock = {
        permission: 'denied'
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: NotificationMock
        },
        writable: true,
        configurable: true
      })

      global.Notification = NotificationMock as unknown as typeof Notification

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve({
              active: {
                postMessage: vi.fn()
              }
            })
          }
        },
        writable: true,
        configurable: true
      })

      const data: NotificationData = {
        title: 'Test',
        body: 'Test body',
        tag: 'test-tag'
      }

      await showNotification(data)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Notification permission not granted')

      consoleWarnSpy.mockRestore()
    })

    it('should send message to service worker when permission granted', async () => {
      const mockPostMessage = vi.fn()
      const mockRegistration = {
        active: {
          postMessage: mockPostMessage
        }
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: {
            permission: 'granted'
          }
        },
        writable: true,
        configurable: true
      })

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve(mockRegistration)
          }
        },
        writable: true,
        configurable: true
      })

      const data: NotificationData = {
        title: 'Test Notification',
        body: 'This is a test',
        tag: 'test-tag'
      }

      await showNotification(data)
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'SHOW_NOTIFICATION',
        title: 'Test Notification',
        body: 'This is a test',
        tag: 'test-tag'
      })
    })
  })

  describe('scheduleNotification', () => {
    it('should show notification immediately if time has passed', () => {
      const pastDate = new Date(Date.now() - 1000)
      const showNotificationSpy = vi.spyOn({ showNotification }, 'showNotification')

      const data: NotificationData = {
        title: 'Test',
        body: 'Test body',
        tag: 'test-tag'
      }

      scheduleNotification(data, pastDate)
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    it('should schedule notification for future time', () => {
      const futureDate = new Date(Date.now() + 5000)
      const data: NotificationData = {
        title: 'Test',
        body: 'Test body',
        tag: 'test-tag'
      }

      scheduleNotification(data, futureDate)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number))
    })

    it('should warn if notification scheduled too far in the future', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const veryFutureDate = new Date(Date.now() + 2147483648) // Beyond max timeout

      const data: NotificationData = {
        title: 'Test',
        body: 'Test body',
        tag: 'test-tag'
      }

      scheduleNotification(data, veryFutureDate)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Notification scheduled too far in the future, cannot schedule'
      )

      consoleWarnSpy.mockRestore()
    })

    it('should schedule notification for future time', () => {
      const futureDate = new Date(Date.now() + 5000)

      const data: NotificationData = {
        title: 'Test',
        body: 'Test body',
        tag: 'test-tag'
      }

      // Should not throw when scheduling
      expect(() => scheduleNotification(data, futureDate)).not.toThrow()
    })
  })

  describe('scheduleBatchNotifications', () => {
    it('should not schedule notifications for dates in the past', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const batch: BatchDates = {
        batchName: 'Test Batch',
        acceptanceCheckDate: yesterday.toISOString(),
        firstCageDate: null,
        secondCageDate: null,
        hatchDate: null
      }

      scheduleBatchNotifications(batch)
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    it('should schedule notifications for today dates', () => {
      // Set fake system time to today at 6 AM (before the 8 AM notification time)
      const now = new Date()
      now.setHours(6, 0, 0, 0)
      vi.setSystemTime(now)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const batch: BatchDates = {
        batchName: 'Test Batch',
        acceptanceCheckDate: today.toISOString(),
        firstCageDate: null,
        secondCageDate: null,
        hatchDate: null
      }

      scheduleBatchNotifications(batch)
      expect(setTimeoutSpy).toHaveBeenCalled()
    })

    it('should handle multiple date types', () => {
      // Set fake system time to today at 6 AM
      const now = new Date()
      now.setHours(6, 0, 0, 0)
      vi.setSystemTime(now)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const batch: BatchDates = {
        batchName: 'Multi-Event Batch',
        acceptanceCheckDate: today.toISOString(),
        firstCageDate: today.toISOString(),
        secondCageDate: today.toISOString(),
        hatchDate: today.toISOString()
      }

      scheduleBatchNotifications(batch)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(4)
    })

    it('should skip null dates', () => {
      // Set fake system time to today at 6 AM
      const now = new Date()
      now.setHours(6, 0, 0, 0)
      vi.setSystemTime(now)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const batch: BatchDates = {
        batchName: 'Partial Batch',
        acceptanceCheckDate: today.toISOString(),
        firstCageDate: null,
        secondCageDate: null,
        hatchDate: null
      }

      scheduleBatchNotifications(batch)
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    })

    it('should not schedule for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const batch: BatchDates = {
        batchName: 'Future Batch',
        acceptanceCheckDate: tomorrow.toISOString(),
        firstCageDate: null,
        secondCageDate: null,
        hatchDate: null
      }

      scheduleBatchNotifications(batch)
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })
  })

  describe('initializeNotifications', () => {
    it('should return false if service worker registration fails', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      })

      const result = await initializeNotifications()
      expect(result).toBe(false)
    })

    it('should return true if both registration and permission succeed', async () => {
      const mockRegistration = { scope: '/', active: true }
      const mockRegister = vi.fn().mockResolvedValue(mockRegistration)
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister
          }
        },
        writable: true,
        configurable: true
      })

      const NotificationMock = {
        permission: 'default',
        requestPermission: mockRequestPermission
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: NotificationMock
        },
        writable: true,
        configurable: true
      })

      global.Notification = NotificationMock as unknown as typeof Notification

      const result = await initializeNotifications()
      expect(result).toBe(true)
      expect(mockRegister).toHaveBeenCalled()
      expect(mockRequestPermission).toHaveBeenCalled()
    })

    it('should return false if permission is denied', async () => {
      const mockRegistration = { scope: '/', active: true }
      const mockRegister = vi.fn().mockResolvedValue(mockRegistration)

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister
          }
        },
        writable: true,
        configurable: true
      })

      const NotificationMock = {
        permission: 'denied'
      }

      Object.defineProperty(global, 'window', {
        value: {
          Notification: NotificationMock
        },
        writable: true,
        configurable: true
      })

      global.Notification = NotificationMock as unknown as typeof Notification

      const result = await initializeNotifications()
      expect(result).toBe(false)
    })
  })
})

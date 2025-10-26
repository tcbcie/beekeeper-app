// Browser Push Notification Utility
// Handles notification permissions and scheduling

export interface NotificationData {
  title: string
  body: string
  tag: string
  scheduledTime?: Date
}

/**
 * Register the service worker for notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    })
    console.log('Service Worker registered successfully:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported in this browser')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

/**
 * Show a browser notification immediately
 */
export async function showNotification(data: NotificationData): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  const registration = await navigator.serviceWorker.ready

  // Send message to service worker to show notification
  if (registration.active) {
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: data.title,
      body: data.body,
      tag: data.tag,
    })
  }
}

/**
 * Schedule a notification to be shown at a specific time
 * Note: Browser notifications don't support native scheduling, so we use setTimeout
 * This only works while the browser tab is open. For persistent scheduling,
 * we would need a backend service.
 */
export function scheduleNotification(data: NotificationData, scheduledTime: Date): void {
  const now = new Date()
  const timeUntil = scheduledTime.getTime() - now.getTime()

  if (timeUntil <= 0) {
    // Time has passed, show immediately
    showNotification(data)
    return
  }

  // Maximum setTimeout is ~24.8 days, so check if within that range
  const maxTimeout = 2147483647 // Maximum 32-bit signed integer
  if (timeUntil > maxTimeout) {
    console.warn('Notification scheduled too far in the future, cannot schedule')
    return
  }

  setTimeout(() => {
    showNotification(data)
  }, timeUntil)

  console.log(`Notification scheduled for ${scheduledTime.toLocaleString()}`)
}

/**
 * Schedule notifications for a queen rearing batch
 * This will check dates and schedule day-of notifications
 */
export interface BatchDates {
  batchName: string
  acceptanceCheckDate?: string | null
  firstCageDate?: string | null
  secondCageDate?: string | null
  hatchDate?: string | null
}

export function scheduleBatchNotifications(batch: BatchDates): void {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const scheduleIfToday = (dateStr: string | null | undefined, eventType: string) => {
    if (!dateStr) return

    const eventDate = new Date(dateStr)
    eventDate.setHours(8, 0, 0, 0) // Schedule for 8 AM

    // Check if the date is today
    const eventDateOnly = new Date(eventDate)
    eventDateOnly.setHours(0, 0, 0, 0)

    if (eventDateOnly.getTime() === today.getTime()) {
      const notificationData: NotificationData = {
        title: `Queen Rearing Reminder: ${eventType}`,
        body: `Today is ${eventType} for batch "${batch.batchName}"`,
        tag: `batch-${batch.batchName}-${eventType}`,
      }

      scheduleNotification(notificationData, eventDate)
    }
  }

  // Schedule notifications for each event type
  scheduleIfToday(batch.acceptanceCheckDate, 'Acceptance Check')
  scheduleIfToday(batch.firstCageDate, '1st Option to Cage')
  scheduleIfToday(batch.secondCageDate, '2nd Option to Cage')
  scheduleIfToday(batch.hatchDate, 'Expected Hatch Date')
}

/**
 * Initialize notifications: register service worker and request permission
 */
export async function initializeNotifications(): Promise<boolean> {
  const registration = await registerServiceWorker()
  if (!registration) return false

  const permission = await requestNotificationPermission()
  return permission === 'granted'
}

// Service Worker for Browser Push Notifications
// Handles notification display and click events

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(clients.claim())
})

// Handle notification click - navigate to batches page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow('/dashboard/batches')
  )
})

// Listen for messages from the main thread to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data

    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192x192.png', // You can add an app icon here
      badge: '/badge-72x72.png', // You can add a badge icon here
      tag: tag, // Prevents duplicate notifications
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  }
})

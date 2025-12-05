// Service Worker for Browser Push Notifications and Offline Support
// Handles notification display, click events, and offline caching

const CACHE_NAME = 'hivecraic-v1.4.8'
const OFFLINE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/offline.html',
  '/icon-192x192.png',
  '/badge-72x72.png',
]

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching offline pages')
      return cache.addAll(OFFLINE_URLS).catch(err => {
        console.warn('Failed to cache some resources:', err)
      })
    })
    // DO NOT call skipWaiting() automatically
    // Wait for SKIP_WAITING message from update manager
  )
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => clients.claim())
  )
})

// Handle notification click - navigate to batches page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow('/dashboard/batches')
  )
})

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (!event.data) return

  // Handle skip waiting message (from update manager)
  if (event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING message, activating new service worker...')
    self.skipWaiting()
    return
  }

  // Handle notification display
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data

    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: tag, // Prevents duplicate notifications
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  }
})

// Background Sync handler for offline data synchronization
self.addEventListener('sync', (event) => {
  console.log('Background sync event triggered:', event.tag)

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Notify all clients to trigger sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: event.tag
          })
        })
      }).then(() => {
        console.log('Background sync notification sent to clients')
      }).catch((error) => {
        console.error('Background sync failed:', error)
      })
    )
  }
})

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API calls to Supabase - these need internet connection
  if (event.request.url.includes('supabase.co')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If online, update cache with fresh content
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // If offline, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // If not in cache and offline, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html')
          }
        })
      })
  )
})

// Handle push notifications (for Web Push API)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)

  const data = event.data ? event.data.json() : {}
  const title = data.title || 'HiveCraic Notification'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

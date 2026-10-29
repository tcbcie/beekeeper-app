// Service Worker for Browser Push Notifications and Offline Support
// Handles notification display, click events, and offline caching

const CACHE_NAME = 'hivecraic-v1.13.0'
const MAPBOX_CACHE_NAME = 'hivecraic-mapbox-tiles'
const OFFLINE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
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

// Delete cached entries from CACHE_NAME that match `shouldDelete(url)`.
function deleteCachedEntries(shouldDelete) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.keys().then((requests) =>
      Promise.all(requests.map((request) => {
        return shouldDelete(new URL(request.url)) ? cache.delete(request) : undefined
      }))
    )
  )
}

// Our own /api/* routes return per-user data. Earlier worker versions cached them
// (keyed by URL only, so readable by the next person on the device); drop them.
function isOwnApi(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/api/')
}

// On sign-out keep only the immutable build assets and the offline shell; anything
// else (third-party lookups such as weather or geocoding carry apiary locations).
function isUserData(url) {
  const sameOrigin = url.origin === self.location.origin
  return !(sameOrigin && (url.pathname.startsWith('/_next/static/') || OFFLINE_URLS.includes(url.pathname)))
}

// Size caps (C1-08, C1-09). Pages and lookups kept for offline use, and Mapbox tiles, used to grow
// without limit; on a full phone the browser can then evict all of the site's storage, offline
// pages included. The offline pages are never trimmed. Build assets are kept generously (one
// build is a few hundred files) and only the oldest go once a deploy has piled up many (batch 46).
const MAX_PAGE_ENTRIES = 100
const MAX_STATIC_ENTRIES = 400
const MAX_MAPBOX_ENTRIES = 1500

// On a weak signal that isn't fully offline, a page could wait tens of seconds for the network.
// After this long the saved copy is shown instead, and the network answer still refreshes it.
const NAVIGATION_TIMEOUT_MS = 4000

function isStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')
}
const TRIM_EVERY_PUTS = 25
const putsSinceTrim = {}

// Keep the newest `max` entries that `shouldTrim` selects. cache.keys() lists entries in the order
// they were written, so the oldest go first. Run every few writes rather than on each one, and
// best-effort like all caching here.
function maybeTrimCache(cacheName, max, shouldTrim) {
  // Counted per cache and per kind of entry: build assets and pages share one cache, and a shared
  // count would let a burst of asset writes keep resetting it before the pages were ever trimmed.
  const key = `${cacheName}:${shouldTrim.name}`
  putsSinceTrim[key] = (putsSinceTrim[key] || 0) + 1
  if (putsSinceTrim[key] < TRIM_EVERY_PUTS) return
  putsSinceTrim[key] = 0
  caches.open(cacheName)
    .then((cache) => cache.keys().then((keys) => {
      const candidates = keys.filter((request) => shouldTrim(new URL(request.url)))
      const excess = candidates.length - max
      if (excess <= 0) return undefined
      return Promise.all(candidates.slice(0, excess).map((request) => cache.delete(request)))
    }))
    .catch(() => { /* best-effort */ })
}

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MAPBOX_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
      .then(() => deleteCachedEntries(isOwnApi))
      .catch((err) => console.warn('Cache clean-up failed:', err))
      .then(() => clients.claim())
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

  // Sent by the app on sign-out (src/lib/sign-out-cleanup.ts)
  if (event.data.type === 'CLEAR_USER_DATA') {
    event.waitUntil(
      deleteCachedEntries(isUserData).catch((err) => console.warn('Clearing user data failed:', err))
    )
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

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  // Only ever handle same-method GETs. Anything else (POST/PUT/PATCH/DELETE,
  // including all Supabase REST/RPC writes) must pass straight through to the
  // network untouched — never let the worker fabricate a response for them.
  if (event.request.method !== 'GET') {
    return
  }

  // Skip ALL API calls (Supabase REST/RPC/Auth/Storage) — they need the network
  // and must not be served from cache.
  if (event.request.url.includes('supabase.co') || event.request.url.includes('/rest/v1/')) {
    return
  }

  // Never cache our own API routes either: they return per-user data, and the
  // cache is keyed by URL only, so a later user on this device could be served it.
  const requestUrl = new URL(event.request.url)
  if (isOwnApi(requestUrl)) {
    return
  }

  // Next.js page-data (RSC) requests carry a changing ?_rsc= code, so storing them piled up copies
  // for every link the app prefetched, and offline they could serve an older build's data to newer
  // code. Leave them to the network: offline, Next falls back to a full page load, which is served
  // from the cached page or /offline.html (C1-08).
  if (event.request.headers.get('RSC') === '1' || requestUrl.searchParams.has('_rsc')) {
    return
  }

  // Cache-first strategy for Next.js build assets: files under /_next/static/
  // are content-hashed and immutable, so once cached they never need the
  // network again. This is what makes the app open fast on poor connections
  // in the field. Old entries are purged when CACHE_NAME is bumped.
  const requestPath = requestUrl.pathname
  if (requestPath.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone())
                .then(() => maybeTrimCache(CACHE_NAME, MAX_STATIC_ENTRIES, isStaticAsset))
                .catch(() => { /* best-effort */ })
            }
            return response
          })
        })
      })
    )
    return
  }

  // Cache-first strategy for Mapbox tiles, styles, fonts, and sprites
  if (event.request.url.includes('api.mapbox.com') || event.request.url.includes('tiles.mapbox.com')) {
    event.respondWith(
      caches.open(MAPBOX_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone()).catch(() => { /* best-effort */ })
              maybeTrimCache(MAPBOX_CACHE_NAME, MAX_MAPBOX_ENTRIES, () => true)
            }
            return response
          })
        })
      })
    )
    return
  }

  const networkFetch = fetch(event.request)
    .then((response) => {
      // If online, update cache with fresh content. cache.put can reject for
      // unsupported schemes/responses — never let that become an unhandled
      // rejection in the worker.
      if (response && response.status === 200) {
        const responseToCache = response.clone()
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseToCache))
          .then(() => maybeTrimCache(CACHE_NAME, MAX_PAGE_ENTRIES, isUserData))
          .catch(() => { /* caching is best-effort */ })
      }
      return response
    })

  // If offline, try to serve from cache
  const fromCache = () => caches.match(event.request).then((cachedResponse) => {
    if (cachedResponse) {
      return cachedResponse
    }

    // If not in cache and offline, show the offline page for navigations.
    if (event.request.mode === 'navigate') {
      return caches.match('/offline.html').then((offline) => offline || Response.error())
    }

    // Never resolve respondWith() with undefined — that throws
    // "Failed to convert value to 'Response'". Surface a network error.
    return Response.error()
  })

  if (event.request.mode !== 'navigate') {
    event.respondWith(networkFetch.catch(fromCache))
    return
  }

  // Pages: the network, unless it takes longer than NAVIGATION_TIMEOUT_MS and a saved copy exists.
  // With no saved copy the page keeps waiting for the network as before.
  event.respondWith(new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse && !settled) {
          settled = true
          resolve(cachedResponse)
        }
      }).catch(() => { /* keep waiting for the network */ })
    }, NAVIGATION_TIMEOUT_MS)
    networkFetch
      .then((response) => {
        clearTimeout(timer)
        if (!settled) {
          settled = true
          resolve(response)
        }
      })
      .catch(() => {
        clearTimeout(timer)
        if (!settled) {
          settled = true
          resolve(fromCache())
        }
      })
  }))
  // Keep the worker alive until the network answers, so a late answer still refreshes the copy.
  event.waitUntil(networkFetch.catch(() => { /* already handled above */ }))
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

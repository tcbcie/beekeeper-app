# HiveCraic Offline Features Documentation

Complete guide to the offline-first capabilities of HiveCraic PWA.

## Overview

HiveCraic now supports comprehensive offline functionality including:
- ✅ **IndexedDB Local Storage** - Store hive data locally
- ✅ **Background Sync API** - Auto-sync when connection returns
- ✅ **Web Push Notifications** - Persistent notifications even when browser closed
- ✅ **Offline Queue System** - Queue changes while offline, sync automatically
- ✅ **Smart Caching** - View previously loaded data offline

## Features

### 1. IndexedDB for Local Data Storage

All hive-related data can be stored locally using IndexedDB:

**Stored Data:**
- Hives
- Batches (Queen Rearing)
- Queens
- Apiaries
- Inspections
- Pending sync operations

**Location:** `src/lib/offline-db.ts`

**Usage:**
```typescript
import { offlineDB, STORES } from '@/lib/offline-db'

// Store data
await offlineDB.put(STORES.HIVES, hiveData)

// Retrieve data
const hives = await offlineDB.getAllByUserId(STORES.HIVES, userId)

// Delete data
await offlineDB.delete(STORES.HIVES, hiveId)
```

### 2. Background Sync API

Automatically syncs pending changes when internet connection is restored, even if the browser tab is closed.

**Location:** `public/service-worker.js` (lines 67-88)

**How it works:**
1. User makes changes while offline
2. Changes are queued in IndexedDB
3. Background sync is registered with service worker
4. When connection returns, service worker triggers sync
5. App syncs all pending changes automatically

**Manual Sync:**
```typescript
import { syncManager } from '@/lib/sync-manager'

// Manually trigger sync
const result = await syncManager.syncPendingActions()
console.log(`${result.success} synced, ${result.failed} failed`)
```

### 3. Web Push Notifications

Receive notifications even when browser is closed.

**Setup Required:**
1. Run database migration: `sql/add_push_subscriptions.sql`
2. Generate VAPID keys (optional for enhanced security)
3. Subscribe user to push notifications

**Location:** `src/lib/push-notifications.ts`

**Usage:**
```typescript
import { pushNotificationManager } from '@/lib/push-notifications'

// Subscribe to push notifications
const subscription = await pushNotificationManager.subscribe(userId)

// Check subscription status
const currentSub = await pushNotificationManager.getSubscription()

// Unsubscribe
await pushNotificationManager.unsubscribe(userId)
```

**Backend Integration:**
To send push notifications from your backend, use the stored subscription data in the `push_subscriptions` table.

### 4. Offline Queue System

Changes made offline are queued and automatically synced when online.

**Location:** `src/lib/sync-manager.ts`

**Supported Operations:**
- Create records
- Update records
- Delete records

**How it works:**
```typescript
import { syncManager } from '@/lib/sync-manager'

// Queue an action while offline
await syncManager.queueAction('create', 'hives', hiveData, userId)

// Check pending count
const pendingCount = await syncManager.getPendingSyncCount(userId)

// Listen for sync completion
const unsubscribe = syncManager.onSyncComplete((success) => {
  if (success) {
    console.log('All changes synced!')
  }
})
```

### 5. React Hook for Offline Data

Easy-to-use React hook that handles online/offline data automatically.

**Location:** `src/hooks/useOfflineData.ts`

**Usage Example:**
```typescript
import { useOfflineData } from '@/hooks/useOfflineData'
import { STORES } from '@/lib/offline-db'

function MyComponent() {
  const {
    data: hives,
    loading,
    error,
    isOnline,
    create,
    update,
    remove,
    refresh
  } = useOfflineData('hives', STORES.HIVES)

  const handleCreateHive = async () => {
    const newHive = await create({
      name: 'New Hive',
      apiary_id: apiaryId,
      // ... other fields
    })
    // Works offline! Auto-syncs when online
  }

  const handleUpdateHive = async (id: string) => {
    await update(id, { name: 'Updated Name' })
    // Works offline! Auto-syncs when online
  }

  const handleDeleteHive = async (id: string) => {
    await remove(id)
    // Works offline! Auto-syncs when online
  }

  return (
    <div>
      {!isOnline && <p>Offline - viewing cached data</p>}
      {loading ? <p>Loading...</p> : hives.map(hive => ...)}
    </div>
  )
}
```

## UI Components

### OfflineIndicator

Shows when user goes offline/comes back online.

**Location:** `src/components/OfflineIndicator.tsx`

**Features:**
- Auto-detects online/offline status
- Shows notification when going offline
- Shows "Back Online" message when reconnecting
- Auto-hides after 3 seconds when online

### PendingSyncIndicator

Shows pending changes waiting to sync.

**Location:** `src/components/PendingSyncIndicator.tsx`

**Features:**
- Shows count of pending changes
- Manual sync button
- Sync progress indicator
- Success/failure notifications
- Auto-syncs when connection returns

## Database Migration

Run this SQL to enable push notifications:

```bash
# Connect to your Supabase database
psql postgresql://your-connection-string

# Run migration
\i sql/add_push_subscriptions.sql
```

Or use Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `sql/add_push_subscriptions.sql`
3. Run query

## Service Worker Features

**Location:** `public/service-worker.js`

**Capabilities:**
1. **Offline Caching** - Caches pages and assets for offline access
2. **Background Sync** - Syncs data when connection returns
3. **Push Notifications** - Handles incoming push notifications
4. **Smart Fetch Strategy** - Network-first with cache fallback

**Cache Strategy:**
- Online: Fetch from network, update cache
- Offline: Serve from cache
- Navigation offline: Show offline.html page

## User Experience

### Scenario 1: Beekeeper at Apiary (No Signal)

1. User opens app while online at home
2. Views their hives and batches (data is cached)
3. Travels to apiary with no cell signal
4. App still works! Can view cached data
5. Makes inspection notes (queued for sync)
6. Returns home, gets signal
7. Changes auto-sync to Supabase
8. Notification: "All changes synced!"

### Scenario 2: First-Time User (Offline)

1. User tries to open app while offline
2. Sees beautiful offline page
3. Offline page explains they need internet to log in
4. Auto-redirects to dashboard when connection returns

### Scenario 3: Offline Editing

1. User is viewing batch details
2. Loses connection mid-session
3. Offline indicator appears: "You're Offline"
4. User updates batch notes anyway
5. Pending sync indicator shows: "1 change waiting to sync"
6. Connection returns
7. Background sync triggers automatically
8. Success notification: "Sync Complete - 1 change synced"

## Limitations

### Current Limitations

1. **Cannot login while offline**
   - Server-based authentication requires internet
   - Users must be online for first login
   - Session persists while offline if already logged in

2. **Read-only cached data**
   - Can create/update/delete, but changes queue for sync
   - Data shows immediately in UI (optimistic updates)
   - Actual sync happens when online

3. **Cache expiry**
   - Cached session follows Supabase token expiry (~1 hour)
   - Offline too long requires re-authentication

4. **Limited cached data**
   - Only previously loaded pages/data are cached
   - New data won't appear until back online

### Future Enhancements

1. **Conflict Resolution**
   - Handle sync conflicts when multiple devices edit same record
   - Currently: last sync wins

2. **Selective Sync**
   - Option to sync only certain tables
   - Bandwidth optimization

3. **Compression**
   - Compress cached data to save space
   - Reduce IndexedDB storage usage

## Browser Support

### Required APIs

- ✅ Service Workers (Chrome 40+, Firefox 44+, Safari 11.1+)
- ✅ IndexedDB (Chrome 24+, Firefox 16+, Safari 10+)
- ✅ Cache API (Chrome 40+, Firefox 41+, Safari 11.1+)
- ⚠️ Background Sync (Chrome 49+, Edge 79+, **not Safari**)
- ⚠️ Push API (Chrome 42+, Firefox 44+, **not Safari on iOS**)

### Fallback Behavior

**No Background Sync:**
- Manual sync button still works
- Auto-sync on page load when online
- Sync on visibility change

**No Push API:**
- Falls back to browser notifications (tab must be open)
- Scheduled notifications still work while tab open

## Testing Offline Functionality

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Test app behavior

### Firefox DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Click "No throttling" dropdown
4. Select "Offline"

### Testing Background Sync

1. Go offline in DevTools
2. Make changes (create/update/delete)
3. Check pending sync indicator
4. Go back online
5. Watch background sync trigger

### Testing Service Worker

```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  console.log('Service Worker:', reg.active.state)
})

// Check cache
caches.keys().then(keys => console.log('Caches:', keys))

// Check IndexedDB
indexedDB.databases().then(dbs => console.log('Databases:', dbs))
```

## Troubleshooting

### Service Worker Not Installing

**Check:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered:', regs.length)
  regs.forEach(reg => console.log(reg.scope))
})
```

**Fix:**
1. Unregister old service workers
2. Clear cache
3. Hard reload (Ctrl+Shift+R)

### Background Sync Not Working

**Safari/iOS:** Background Sync API not supported
- Falls back to manual sync
- Auto-sync on app open

**Chrome:** Check registration
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.sync.getTags().then(tags => console.log('Sync tags:', tags))
})
```

### IndexedDB Errors

**Check quota:**
```javascript
navigator.storage.estimate().then(estimate => {
  console.log('Used:', estimate.usage)
  console.log('Quota:', estimate.quota)
})
```

**Clear database:**
```javascript
// In browser console
indexedDB.deleteDatabase('HiveCraicOfflineDB')
```

### Push Notifications Not Working

**Check permission:**
```javascript
console.log('Permission:', Notification.permission)
```

**Request again:**
```javascript
Notification.requestPermission().then(console.log)
```

**Check subscription:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

## Performance Considerations

### IndexedDB Size

- Each hive: ~500 bytes
- Each batch: ~800 bytes
- Each inspection: ~1KB
- 1000 hives + 500 batches + 5000 inspections = ~5.9MB

**Browser Quotas:**
- Chrome: 60% of available disk space
- Firefox: 50% of available disk space
- Safari: 1GB per origin

### Sync Performance

- 100 pending actions: ~2-5 seconds
- 1000 pending actions: ~10-30 seconds
- Syncs sequentially to maintain data integrity

### Cache Size

- Cached pages: ~100KB per page
- Images: Actual file size
- Total: Usually < 5MB for typical usage

## Security Notes

### IndexedDB Security

- Data stored unencrypted in browser
- Accessible only to same origin
- Cleared when user clears browser data
- **Don't store sensitive credentials**

### Service Worker Security

- Requires HTTPS (except localhost)
- Can only intercept same-origin requests
- Updated automatically when file changes

### Push Notification Security

- Subscription keys stored in database
- VAPID keys recommended for enhanced security
- Messages encrypted end-to-end

## Best Practices

### For Developers

1. **Always use `useOfflineData` hook** for consistent behavior
2. **Test offline scenarios** before deploying
3. **Handle sync failures gracefully**
4. **Show clear offline indicators** to users
5. **Implement optimistic UI updates** for better UX

### For Users

1. **Load data before going offline** (visit pages while online)
2. **Check pending sync indicator** before closing app
3. **Don't force-quit browser** while sync in progress
4. **Re-login periodically** to refresh auth token

## Examples

### Example 1: Offline Hive Inspection

```typescript
import { useOfflineData } from '@/hooks/useOfflineData'
import { STORES } from '@/lib/offline-db'

function HiveInspection({ hiveId }: { hiveId: string }) {
  const { create, isOnline } = useOfflineData('inspections', STORES.INSPECTIONS)

  const handleInspection = async (notes: string) => {
    const inspection = await create({
      hive_id: hiveId,
      notes,
      inspected_at: new Date().toISOString(),
      // ... other fields
    })

    if (!isOnline) {
      alert('Inspection saved! Will sync when online.')
    } else {
      alert('Inspection synced to cloud!')
    }
  }

  return (
    <button onClick={() => handleInspection('Healthy colony')}>
      Add Inspection {!isOnline && '(Offline)'}
    </button>
  )
}
```

### Example 2: Manual Sync Button

```typescript
import { useState } from 'react'
import { syncManager } from '@/lib/sync-manager'
import { useAuth } from '@/contexts/AuthContext'

function SyncButton() {
  const { userId } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const updateCount = async () => {
      if (userId) {
        const pending = await syncManager.getPendingSyncCount(userId)
        setCount(pending)
      }
    }

    updateCount()
    const interval = setInterval(updateCount, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const handleSync = async () => {
    setSyncing(true)
    const result = await syncManager.syncPendingActions()
    setSyncing(false)
    alert(`Synced ${result.success} changes!`)
  }

  if (count === 0) return null

  return (
    <button onClick={handleSync} disabled={syncing}>
      {syncing ? 'Syncing...' : `Sync ${count} changes`}
    </button>
  )
}
```

### Example 3: Push Notification Setup

```typescript
import { useEffect } from 'react'
import { pushNotificationManager } from '@/lib/push-notifications'
import { useAuth } from '@/contexts/AuthContext'

function NotificationSetup() {
  const { userId } = useAuth()

  const handleSubscribe = async () => {
    if (!userId) return

    const subscription = await pushNotificationManager.subscribe(userId)

    if (subscription) {
      alert('Push notifications enabled!')
    } else {
      alert('Please enable notifications in browser settings')
    }
  }

  return (
    <button onClick={handleSubscribe}>
      Enable Push Notifications
    </button>
  )
}
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Test in Chrome DevTools offline mode
4. Check GitHub issues: [github.com/yourorg/hivecraic/issues](https://github.com/yourorg/hivecraic/issues)

## Changelog

### v1.5.0 (2025-01-28)
- ✅ Added IndexedDB local storage
- ✅ Implemented Background Sync API
- ✅ Added Web Push notification support
- ✅ Created offline queue system
- ✅ Added `useOfflineData` React hook
- ✅ Created offline/pending sync UI indicators
- ✅ Enhanced service worker with sync capabilities
- ✅ Added comprehensive offline documentation

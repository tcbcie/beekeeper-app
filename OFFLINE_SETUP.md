# Offline Features - Setup & Deployment Guide

Quick guide to deploy the new offline features to production.

## 1. Database Migration

Run the push subscriptions migration:

### Option A: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create new query
4. Paste contents of `sql/add_push_subscriptions.sql`
5. Click **Run**

### Option B: CLI
```bash
# Using psql
psql postgresql://your-supabase-connection-string -f sql/add_push_subscriptions.sql

# Or using Supabase CLI
supabase db push
```

## 2. Environment Variables (Optional)

For enhanced push notification security, generate VAPID keys:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

*Note: Push notifications work without VAPID keys, but they're recommended for production.*

## 3. Service Worker Registration

The service worker is already set up in `public/service-worker.js`. It will auto-register on first visit.

**Verify registration:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log(`${regs.length} service worker(s) registered`)
})
```

## 4. Test Offline Functionality

### Local Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open DevTools (F12)**

3. **Go to Application tab** → Service Workers
   - Verify service worker is registered and active

4. **Test offline mode:**
   - Go to Network tab
   - Select "Offline" from dropdown
   - Reload page
   - Verify app still loads

5. **Test offline queue:**
   - While offline, try creating a hive/batch
   - Check pending sync indicator
   - Go back online
   - Verify auto-sync works

### Production Testing

1. **Deploy to Vercel/production**
2. **Visit site on mobile device**
3. **Install PWA:**
   - Chrome: Click "Install HiveCraic"
   - iOS Safari: Share → Add to Home Screen
4. **Enable notifications when prompted**
5. **Test airplane mode:**
   - Turn on airplane mode
   - Open PWA
   - Verify offline functionality

## 5. Key Files Added

### Core Libraries
- `src/lib/offline-db.ts` - IndexedDB wrapper
- `src/lib/sync-manager.ts` - Sync queue manager
- `src/lib/push-notifications.ts` - Push notification manager

### React Hook
- `src/hooks/useOfflineData.ts` - Easy offline data hook

### UI Components
- `src/components/OfflineIndicator.tsx` - Offline status indicator
- `src/components/PendingSyncIndicator.tsx` - Pending sync UI

### Service Worker
- `public/service-worker.js` - Enhanced with background sync & push

### Database
- `sql/add_push_subscriptions.sql` - Push subscriptions table

### Documentation
- `OFFLINE_FEATURES.md` - Complete feature documentation
- `OFFLINE_SETUP.md` - This file

## 6. Verify Everything Works

### Checklist

- [ ] Database migration successful
- [ ] Service worker registered
- [ ] Can go offline and view cached data
- [ ] Can create/update/delete while offline
- [ ] Pending sync indicator appears
- [ ] Auto-sync works when back online
- [ ] Push notifications permission requested
- [ ] Push subscriptions saved to database
- [ ] Offline page shows when not logged in
- [ ] Mobile PWA installs correctly

### Test Commands

```bash
# Check if service worker is running
open http://localhost:3000
# Then in console:
navigator.serviceWorker.controller

# Check IndexedDB
indexedDB.databases()

# Check cache
caches.keys()

# Check push subscription
navigator.serviceWorker.ready.then(reg =>
  reg.pushManager.getSubscription()
)
```

## 7. Common Issues & Fixes

### Service Worker Not Updating

**Problem:** Old service worker still active after deployment

**Fix:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
})
// Then hard refresh (Ctrl+Shift+R)
```

Or add to code:
```javascript
// Force update on load (development only)
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update())
})
```

### IndexedDB Errors

**Problem:** QuotaExceededError

**Fix:**
```javascript
// Check storage
navigator.storage.estimate().then(est => {
  console.log(`Used: ${est.usage} / ${est.quota}`)
})

// Clear old data
indexedDB.deleteDatabase('HiveCraicOfflineDB')
```

### Push Notifications Not Working

**Problem:** Permission denied or not showing

**Fixes:**
1. Check browser settings allow notifications
2. Verify HTTPS (required for push)
3. Check permission:
   ```javascript
   Notification.permission // should be 'granted'
   ```
4. Request again:
   ```javascript
   Notification.requestPermission()
   ```

### Background Sync Not Triggering

**Problem:** Sync doesn't happen automatically

**Note:** Safari doesn't support Background Sync API

**Fix:** Manual fallback already implemented
- Sync on app open
- Manual sync button
- Sync on visibility change

## 8. Mobile App Installation

### Android (Chrome)

1. Visit site on Chrome
2. Tap menu (⋮)
3. Tap "Install app" or "Add to Home screen"
4. App icon appears on home screen
5. Opens in standalone mode (no browser UI)

### iOS (Safari)

1. Visit site on Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Enter name (pre-filled)
5. Tap "Add"
6. App icon appears on home screen

**Note:** iOS Safari doesn't support:
- Background Sync API
- Push API (for background notifications)

Fallback behavior:
- Manual sync works
- Browser notifications work (while tab open)
- Scheduled notifications work (while tab open)

## 9. Monitoring & Analytics

### Track Offline Usage

Add to your analytics (optional):

```typescript
// Track offline sessions
if (!navigator.onLine) {
  analytics.track('offline_session_start')
}

window.addEventListener('online', () => {
  analytics.track('back_online')
})

// Track sync events
syncManager.onSyncComplete((success) => {
  analytics.track('sync_complete', { success })
})
```

### Monitor Service Worker

```javascript
// Track service worker lifecycle
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('Service worker updated')
})
```

## 10. Performance Optimization

### Cache Strategy

Current: Network-first with cache fallback

Alternative strategies:

**Cache-first (faster, less fresh):**
```javascript
// Serve from cache first, update in background
caches.match(request).then(cached => {
  return cached || fetch(request)
})
```

**Stale-while-revalidate:**
```javascript
// Serve cache immediately, update in background
caches.match(request).then(cached => {
  const fetchPromise = fetch(request).then(response => {
    caches.open(CACHE_NAME).then(cache => {
      cache.put(request, response.clone())
    })
    return response
  })
  return cached || fetchPromise
})
```

### IndexedDB Optimization

```typescript
// Batch operations
const batch = [hive1, hive2, hive3]
await offlineDB.putMany(STORES.HIVES, batch)

// Instead of:
await offlineDB.put(STORES.HIVES, hive1)
await offlineDB.put(STORES.HIVES, hive2)
await offlineDB.put(STORES.HIVES, hive3)
```

## 11. Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod

# Service worker will be automatically served
# HTTPS enabled by default (required for PWA)
```

### Other Platforms

Requirements:
- ✅ HTTPS enabled
- ✅ Service worker at `/service-worker.js`
- ✅ Manifest at `/manifest.json` (if using)
- ✅ Icons in `/public/`

## 12. Next Steps

### Recommended Enhancements

1. **Add manifest.json** for better PWA experience
2. **Implement conflict resolution** for multi-device sync
3. **Add selective sync** to reduce bandwidth
4. **Implement data compression** for large datasets
5. **Add offline analytics** to track usage patterns

### User Documentation

Create user-facing docs explaining:
- How to install the PWA
- How offline mode works
- When to expect syncing
- Troubleshooting common issues

## Support

If you encounter issues:

1. **Check browser console** for errors
2. **Review `OFFLINE_FEATURES.md`** for detailed documentation
3. **Test in Chrome DevTools** with offline mode
4. **Clear cache and retry** if things seem stuck
5. **Check database migration** ran successfully

For development questions:
- Review code comments in offline libs
- Check example usage in `OFFLINE_FEATURES.md`
- Test with minimal example first

## Summary

You've implemented:
- ✅ Full offline data storage with IndexedDB
- ✅ Background sync for queued changes
- ✅ Web push notifications (with database support)
- ✅ Offline-friendly React hook
- ✅ UI indicators for offline/sync status
- ✅ Enhanced service worker
- ✅ Comprehensive documentation

Users can now:
- 📱 Install HiveCraic as a mobile app
- 🔌 Work completely offline (if logged in)
- 🔄 Auto-sync when connection returns
- 🔔 Receive push notifications
- 👁️ See clear offline/sync status

**Next:** Deploy to production and test on real mobile devices in the field!

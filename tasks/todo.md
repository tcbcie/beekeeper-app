# Offline Functionality Cleanup

## Task: Remove unused offline code (Option B)

## Completed Items
- [x] Remove useOfflineData hook
- [x] Remove offline-db.ts
- [x] Remove sync-manager.ts
- [x] Remove PendingSyncIndicator component
- [x] Remove PendingSyncIndicator from layout
- [x] Clean up service worker (remove background sync handler)
- [x] Update CLAUDE.md documentation
- [x] Remove OFFLINE_FEATURES.md and OFFLINE_SETUP.md
- [x] Verify build passes

## Review Section

### Summary of Changes

**Files Deleted:**
- `src/hooks/useOfflineData.ts` - Unused offline data hook
- `src/lib/offline-db.ts` - IndexedDB wrapper (never used)
- `src/lib/sync-manager.ts` - Sync queue manager (never used)
- `src/components/PendingSyncIndicator.tsx` - UI component for sync status
- `MD/OFFLINE_FEATURES.md` - Outdated documentation
- `MD/OFFLINE_SETUP.md` - Outdated documentation

**Files Modified:**
- `src/app/dashboard/layout.tsx` - Removed PendingSyncIndicator import and usage
- `public/service-worker.js` - Removed background sync event handler
- `.claude/CLAUDE.md` - Updated to reflect current state (no offline data support)

### Rationale

The offline functionality infrastructure existed but was **never integrated** into the actual UI components:
- All dashboard pages made direct Supabase calls
- The `useOfflineData` hook was never imported anywhere
- This was essentially dead code adding maintenance burden

### What Remains

- **Service Worker** - Still handles PWA installation, page caching, and push notifications
- **OfflineIndicator** - Shows when user is offline (visual indicator only)
- **Push Notifications** - Still fully functional

### Impact

- Reduced codebase complexity
- Removed ~500 lines of unused code
- Build still passes with no errors
- App behavior unchanged (offline data never worked anyway)

### Build Verification

```
✓ Compiled successfully in 19.7s
✓ Linting and checking validity of types
✓ Generating static pages (30/30)
```

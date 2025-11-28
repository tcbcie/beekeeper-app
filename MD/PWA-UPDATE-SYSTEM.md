# PWA Update System

## Overview

The HiveCraic PWA implements a robust update mechanism that provides users with notifications when new versions are available and allows controlled updates without forcing immediate refreshes.

## How It Works

### 1. Service Worker Update Flow

The service worker (`public/service-worker.js`) uses a controlled update strategy:

- **Install Phase**: New service worker downloads and installs but **does not** automatically activate
- **Waiting Phase**: New service worker waits for user approval before taking control
- **Activation**: Only activates when user clicks "Update Now" in the notification

### 2. Update Manager (`src/lib/update-manager.ts`)

The `UpdateManager` class handles the update lifecycle:

- **Initialization**: Registers with the service worker and sets up event listeners
- **Update Detection**: Automatically checks for updates every 30 minutes
- **Visibility Checks**: Checks for updates when the user returns to the app
- **State Management**: Tracks update status (checking, available, installing, ready, etc.)
- **User Control**: Allows users to apply or dismiss updates

### 3. Update Notification UI (`src/components/UpdateNotification.tsx`)

A non-intrusive notification appears at the bottom of the screen when an update is ready:

- **Update Now**: Activates the new service worker and reloads the page
- **Later**: Dismisses the notification (user can check manually later)

### 4. Version Display (`src/components/VersionDisplay.tsx`)

Shows the current app version in the sidebar for easy reference.

## Update Triggers

Updates are checked in the following scenarios:

1. **Periodic Checks**: Every 30 minutes while the app is open
2. **Page Visibility**: When the user returns to the tab/app
3. **Manual Check**: Using the "Check for Updates" button (can be added to settings)

## Version Management

### Current Version Location

The version is managed in multiple places for consistency:

- `package.json`: Source of truth (version: "1.4.2")
- `public/manifest.json`: PWA manifest version
- `public/service-worker.js`: Cache name includes version (e.g., 'hivecraic-v1.4.2')
- `next.config.ts`: Injects version into environment variable

### How to Update Version

#### Automated (Recommended)

Use the version bump script which automatically updates all files:

```bash
# Bump patch version (1.4.3 → 1.4.4)
npm run version:bump

# Bump minor version (1.4.3 → 1.5.0)
npm run version:bump -- minor

# Bump major version (1.4.3 → 2.0.0)
npm run version:bump -- major

# Dry run to preview changes
node scripts/bump-version.mjs patch --dry-run
```

The script automatically updates:
- ✅ `package.json` - npm version
- ✅ `version.json` - version registry
- ✅ `public/service-worker.js` - PWA cache name
- ✅ `public/manifest.json` - PWA manifest version
- ✅ `src/app/login/page.tsx` - version badge
- ✅ `src/app/dashboard/page.tsx` - version display
- ✅ `src/app/dashboard/about/page.tsx` - about page version

#### Manual (Not Recommended)

If you need to update manually:

1. Update `package.json` version number
2. Update cache name in `public/service-worker.js` (e.g., `CACHE_NAME = 'hivecraic-v1.4.3'`)
3. Update version in `public/manifest.json`
4. Update version in `version.json`
5. Update UI component versions manually
6. Rebuild the app: `npm run build`
7. Deploy the new version

**Note**: The service worker will detect the change and notify users of the update automatically.

## User Experience

### First Install
1. User installs PWA
2. Service worker caches offline resources
3. App is ready for offline use

### Update Available
1. Browser detects new service worker file
2. New service worker installs in background
3. Update notification appears: "Update Available"
4. User can choose to update now or later

### Applying Update
1. User clicks "Update Now"
2. Service worker activates immediately
3. Page reloads with new version
4. Old caches are cleaned up

## Developer Notes

### Cache Strategy

The service worker uses a **Network First, Cache Fallback** strategy:

- **Online**: Fetches fresh content and updates cache
- **Offline**: Serves from cache
- **API Calls**: Bypassed (require internet connection)

### Controlled Activation

Unlike auto-updating PWAs, this implementation:

- ✅ Notifies users of updates
- ✅ Lets users control when to update
- ✅ Prevents unexpected reloads
- ✅ Shows current version in UI

### Adding Manual Update Check

To add a "Check for Updates" button (e.g., in settings):

```tsx
import { UpdateCheckButton } from '@/components/UpdateNotification'

// In your component
<UpdateCheckButton />
```

## Files Modified/Created

### Created Files
- `src/lib/update-manager.ts` - Core update management logic
- `src/components/UpdateNotification.tsx` - Update notification UI
- `src/components/VersionDisplay.tsx` - Version display component

### Modified Files
- `public/service-worker.js` - Added SKIP_WAITING message handler, version in cache name
- `src/app/dashboard/layout.tsx` - Integrated update manager
- `src/components/Sidebar.tsx` - Added version display
- `next.config.ts` - Injects app version into environment
- `public/manifest.json` - Added version field

## Testing Updates Locally

1. Build the current version: `npm run build && npm start`
2. Install the PWA (or open in browser)
3. Make a change to the service worker version
4. Rebuild: `npm run build && npm start`
5. Reload the page - update notification should appear after detection

## Browser Support

This update system works in all modern browsers that support:
- Service Workers
- PWA installation
- Notification API (optional)

Browsers: Chrome, Edge, Safari (iOS 16.4+), Firefox

## Future Enhancements

Potential improvements:
- [ ] Add update changelog display
- [ ] Show what's new in the update
- [ ] Add "Skip this version" option
- [ ] Background update scheduling
- [ ] Update download progress indicator

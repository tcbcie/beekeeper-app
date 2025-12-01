# Claude Configuration for HiveCraic Beekeeping App

This document outlines the structure of the `.claude` directory and provides project-specific guidance for Claude AI assistance.

## Directory Overview

```
.claude/
├── context/        # Project documentation and reference materials
├── memory/         # Conversation continuity and project memory
├── projects/       # Project-specific configurations
└── tools/          # Tool configurations and integrations
```

## Project Context: HiveCraic

**Project Type:** Next.js 14 PWA (Progressive Web App)
**Purpose:** Beekeeping management application with offline-first capabilities
**Tech Stack:** Next.js, TypeScript, Supabase, TailwindCSS, IndexedDB
**Target Users:** Beekeepers managing apiaries, hives, queens, and breeding batches

## Key Features

### Core Functionality
- **Apiary Management** - Track multiple bee yard locations
- **Hive Management** - Monitor individual hives and configurations
- **Queen Rearing** - Manage breeding batches with timeline tracking
- **Queen Tracking** - Track queen lineage, performance, and genetics
- **Inspection Records** - Log hive inspections and observations

### Technical Features
- **Offline-First Architecture** - IndexedDB local storage with background sync
- **PWA Support** - Installable on mobile devices
- **Web Push Notifications** - Persistent notifications for important dates
- **Background Sync** - Automatic data sync when connection returns
- **Responsive Design** - Mobile-first UI with desktop support
- **Dark Mode** - User preference-based theming

## Development Guidelines

### Code Style
- **TypeScript** - Strict typing, avoid `any` types
- **React Hooks** - Functional components with hooks (useState, useEffect, useCallback)
- **Tailwind CSS** - Utility-first styling, no inline styles
- **ESLint** - Follow project linting rules (no unescaped entities, exhaustive-deps)

### File Organization
```
src/
├── app/              # Next.js app router pages
│   ├── dashboard/    # Protected dashboard routes
│   └── login/        # Authentication pages
├── components/       # Reusable React components
├── contexts/         # React context providers (Auth, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries and helpers
│   ├── supabase.ts   # Supabase client
│   ├── offline-db.ts # IndexedDB wrapper
│   └── sync-manager.ts # Offline sync logic
└── sql/              # Database migrations and schemas
```

### Database Schema
**Primary Tables:**
- `profiles` - User profiles
- `apiaries` - Bee yard locations
- `hives` - Individual hives
- `queens` - Queen bee records
- `rearing_batches` - Queen breeding batches
- `inspections` - Hive inspection logs
- `push_subscriptions` - Web push notification subscriptions

**Key Relationships:**
- Apiaries contain multiple Hives
- Hives may have Queens
- Queens may be part of Rearing Batches
- All records are user-scoped with RLS policies

### Common Tasks

#### Adding a New Feature
1. Check if offline support is needed (`useOfflineData` hook)
2. Add database migration in `sql/` directory
3. Create component in `src/components/`
4. Update routing in `src/app/`
5. Test mobile responsiveness
6. Test offline functionality

#### Fixing Linting Errors
- Replace `'` with `&apos;` in JSX
- Use `useCallback` for functions in effect dependencies
- Replace `any` with proper types or `Record<string, unknown>`
- Remove unused imports and variables

#### Database Changes
1. Create SQL migration file
2. Run via Supabase dashboard SQL editor
3. Update TypeScript types if needed
4. Test with RLS policies

## Important Files

### Documentation
- `OFFLINE_FEATURES.md` - Complete offline functionality documentation
- `OFFLINE_SETUP.md` - Deployment and setup guide
- `README.md` - Project overview and setup instructions

### Core Libraries
- `src/lib/offline-db.ts` - IndexedDB wrapper for local storage
- `src/lib/sync-manager.ts` - Offline sync queue manager
- `src/lib/push-notifications.ts` - Web push notification manager
- `src/hooks/useOfflineData.ts` - React hook for offline data operations

### Service Worker
- `public/service-worker.js` - PWA service worker with offline caching, background sync, and push notifications

## Common Patterns

### Offline Data Hook Usage
```typescript
import { useOfflineData } from '@/hooks/useOfflineData'
import { STORES } from '@/lib/offline-db'

const { data, create, update, remove, isOnline } =
  useOfflineData('hives', STORES.HIVES)
```

### Supabase Queries with RLS
```typescript
const { data, error } = await supabase
  .from('hives')
  .select('*')
  .eq('user_id', userId) // Always filter by user
  .order('created_at', { ascending: false })
```

### Mobile-First Responsive Design
```tsx
{/* Mobile Card View */}
<div className="md:hidden space-y-4">
  {/* Card content */}
</div>

{/* Desktop Table View */}
<div className="hidden md:block">
  <table>...</table>
</div>
```

## Testing Guidelines

### Manual Testing Checklist
- [ ] Test on mobile device (Chrome/Safari)
- [ ] Test offline mode (airplane mode)
- [ ] Test PWA installation
- [ ] Test notification permissions
- [ ] Test background sync
- [ ] Test dark mode
- [ ] Test all CRUD operations

### Browser DevTools Testing
- Network tab: Set to "Offline" to test offline mode
- Application tab: Check service worker status, cache, and IndexedDB
- Console: Check for errors and sync logs

## Deployment

### Vercel Deployment
- Auto-deploys from `main` branch
- Environment variables in Vercel dashboard
- Service worker served automatically
- HTTPS enabled (required for PWA)

### Database Migrations
- Run SQL files via Supabase dashboard
- Test on staging database first
- Backup before major changes

## Known Limitations

### Browser Support
- **Background Sync** - Chrome/Edge only (not Safari)
- **Web Push** - Desktop/Android only (not iOS Safari)
- **IndexedDB** - All modern browsers supported

### Offline Functionality
- Cannot login while offline (server auth required)
- Cached session expires after ~1 hour
- Only previously loaded data available offline
- Sync queue works on next connection

## AI Assistant Guidelines

When assisting with this project:

1. **Prioritize offline functionality** - Always consider how features work offline
2. **Follow mobile-first approach** - Design for mobile, enhance for desktop
3. **Maintain type safety** - Use TypeScript properly, avoid `any`
4. **Consider RLS policies** - All queries must respect Row Level Security
5. **Test thoroughly** - Check linting, TypeScript errors, and offline mode
6. **Document changes** - Update relevant docs when adding features
7. **Commit hygiene** - Clear commit messages, logical grouping of changes

### When Making Changes

**DO:**
- Use `useOfflineData` hook for data operations
- Add responsive mobile/desktop views
- Test offline scenarios
- Follow existing code patterns
- Update documentation

**DON'T:**
- Use `any` types
- Ignore linting errors
- Skip mobile responsiveness
- Forget RLS policies
- Create commits without testing

## Version History

- **v1.4.3** - Added comprehensive offline support (IndexedDB, Background Sync, Web Push)
- **v1.4.2** - Mobile batch editing fixes
- Earlier versions tracked in git history

## Support & Resources

- **Project Repository:** GitHub (check git remote)
- **Database:** Supabase dashboard
- **Deployment:** Vercel dashboard
- **Documentation:** See `OFFLINE_FEATURES.md` for detailed feature docs

---

**Note:** This configuration is optimized for Claude AI assistance on the HiveCraic beekeeping application. Keep this document updated as the project evolves.

Obey those Claude Rules:
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY
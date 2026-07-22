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
**Purpose:** Beekeeping management application
**Tech Stack:** Next.js, TypeScript, Supabase, TailwindCSS
**Target Users:** Beekeepers managing apiaries, hives, queens, and breeding batches

## Key Features

### Core Functionality
- **Apiary Management** - Track multiple bee yard locations
- **Hive Management** - Monitor individual hives and configurations
- **Queen Rearing** - Manage breeding batches with timeline tracking
- **Queen Tracking** - Track queen lineage, performance, and genetics
- **Inspection Records** - Log hive inspections and observations

### Technical Features
- **PWA Support** - Installable on mobile devices
- **Web Push Notifications** - Persistent notifications for important dates
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
│   └── supabase.ts   # Supabase client
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
1. Add database migration in `sql/` directory
2. Create component in `src/components/`
3. Update routing in `src/app/`
4. Test mobile responsiveness

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
- `README.md` - Project overview and setup instructions

### Core Libraries
- `src/lib/supabase.ts` - Supabase client
- `src/lib/notifications.ts` - Browser notification utilities
- `src/lib/team-access.ts` - Cached team/shared-apiary access lookup (use instead of querying team_members/team_apiaries)

### Service Worker
- `public/service-worker.js` - PWA service worker with caching and push notifications

## Common Patterns

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
- [ ] Test PWA installation
- [ ] Test notification permissions
- [ ] Test dark mode
- [ ] Test all CRUD operations

### Browser DevTools Testing
- Application tab: Check service worker status and cache
- Console: Check for errors

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
- **Web Push** - Desktop/Android only (not iOS Safari)

### Connectivity
- App requires internet connection for data operations
- Service worker provides basic page caching for PWA

## AI Assistant Guidelines

When assisting with this project:

1. **Follow mobile-first approach** - Design for mobile, enhance for desktop
2. **Maintain type safety** - Use TypeScript properly, avoid `any`
3. **Consider RLS policies** - All queries must respect Row Level Security
4. **Test thoroughly** - Check linting and TypeScript errors
5. Document changes - Update relevant HTML docs when adding features or media
6. **Commit hygiene** - Clear commit messages, logical grouping of changes

### When Making Changes

**DO:**
- Add responsive mobile/desktop views
- Follow existing code patterns
- Update documentation

**DON'T:**
- Use `any` types
- Ignore linting errors
- Skip mobile responsiveness
- Forget RLS policies
- Create commits without testing

## Version History

- **v1.4.11** - Current version
- Earlier versions tracked in git history

## Support & Resources

- **Project Repository:** GitHub (check git remote)
- **Database:** Supabase dashboard
- **Deployment:** Vercel dashboard

---

**Note:** This configuration is optimized for Claude AI assistance on the HiveCraic beekeeping application. Keep this document updated as the project evolves.

Obey those Claude Rules:

First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.html (using standard HTML formatting to allow for inline images, workflow diagrams, or media embeds).

The plan should have a list of todo items that you can check off as you complete them.

Before you begin working, check in with me and I will verify the plan.

Then, begin working on the todo items, marking them as complete as you go.

Please, every step of the way just give me a high-level explanation of what changes you made.

Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.

Finally, add a review section to the todo.html file with a summary of the changes you made and any other relevant information or visual evidence.

DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY

MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY
When in planning mode and asked to implement a new feature, create a plan in the docs/feature folder with a unique name for future reference.

DO NOT TEST the BUILD yourself but rather prompt the user to test it as this is taking to much time.

For commit comments, do not include - Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

Use a direct database connection using the MCP server rather than parsing saved sql files.

For any new or existing feature, create/update the documentation in docs/features.

Use British English for everything.

For the exploration task, always use multiple agents and consult existing documentation in the features folder.

DO not change the version number by running the existing scripts. This will remain a manually triggered task.





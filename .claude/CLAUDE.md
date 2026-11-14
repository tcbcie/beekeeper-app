# HiveCraic — project guidance for Claude

HiveCraic is a beekeeping management PWA (apiaries, hives, queens, queen rearing, inspections). Most users are 50+ and use it on a phone at the apiary.

## Conventions and gotchas

- **RLS everywhere** - every query must respect Row Level Security; records are user-scoped, with team/shared-apiary access on top.
- **Team access** - use `getTeamAccess()` from `src/lib/team-access.ts` (cached); never query `team_members`/`team_apiaries` directly.
- **Mobile-first** - design for the phone, enhance for desktop; use the `mobile-screen` skill for phone screens.
- **UX/UI work** - always invoke the `hivecraic-frontend-design` skill before designing, building or restyling any screen, component or layout (alongside `mobile-screen` for phone screens). When delegating UX work to a subagent or another session, tell it to use the `hivecraic-frontend-design` skill too.
- **No `any` types** - use proper types or `Record<string, unknown>`.
- **Documentation** - update the relevant docs (docs/features, HTML docs) when adding features or media.
- **Commit hygiene** - clear commit messages, logical grouping of changes.

## Deployment

- Vercel auto-deploys from `main`, so a push to `main` goes to production. Environment variables live in the Vercel dashboard.
- Back up before major database changes.

## Known limitations

- **Web Push** - reminders on this device (Profile → Notifications), sent by the task-event-reminders job; see docs/features/push-notifications.md. Desktop and Android; on iOS 16.4+ only once installed to the Home Screen.

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

NEVER run any tests yourself: not the full suite (`npm test`, `npm run test:run`, `npm run test:coverage`, `npm run test:ui`) and not individual test files (`vitest`, `npx vitest run <file>`). Tests are only run manually by the user; when a change needs testing, prompt them to run it.

For commit comments, do not include - Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

Use a direct database connection using the MCP server rather than parsing saved sql files.

For any new or existing feature, create/update the documentation in docs/features.

Use British English for everything.

For the exploration task, always use multiple agents (the Explore agent type on the Sonnet model, to keep cost down) and consult existing documentation in the features folder.

DO not change the version number by running the existing scripts. This will remain a manually triggered task.

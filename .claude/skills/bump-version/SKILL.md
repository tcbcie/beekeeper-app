---
name: bump-version
description: Bump the app version (patch/minor/major), commit, and push. Only on the user's explicit request.
disable-model-invocation: true
argument-hint: patch|minor|major
allowed-tools: Bash(node scripts/bump-version.mjs:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git tag:*)
---

# Bump Version Skill

Bump the HiveCraic app version using semantic versioning. Version numbers only change when the user explicitly asks; never run this on your own initiative.

## Arguments

`$ARGUMENTS` should be one of: `patch`, `minor`, `major` (defaults to `patch` if empty).

| Type | When | Example |
|---|---|---|
| `patch` | Bug fixes and small improvements | 1.14.0 → 1.14.1 |
| `minor` | New, backward-compatible features | 1.14.0 → 1.15.0 |
| `major` | Breaking changes (schema, removed features, auth changes) | 1.14.0 → 2.0.0 |

## What the script does

`node scripts/bump-version.mjs <type> --yes`:

1. Updates the version and date in these files (via `scripts/update-version.mjs`):
   - `version.json`
   - `package.json`
   - `public/manifest.json`
   - `public/service-worker.js` (PWA cache name)
   - `src/app/login/page.tsx`
   - `src/app/dashboard/page.tsx`
   - `src/app/dashboard/about/page.tsx`
2. **Writes changelog rows to the live Supabase `changelog` table.** It builds them from recent git commits (`scripts/extract-git-changelog.mjs`) and inserts each with `scripts/add-changelog.mjs`, using the service-role key. These rows appear on the About page straight away. Entry types: `feature`, `bugfix`, `improvement`, `documentation`.

The script's closing hints (`git add .`, "manual changelog update in about/page.tsx", tag commands) are out of date. Ignore them and follow the steps below.

## Steps

1. Run `node scripts/bump-version.mjs $ARGUMENTS --yes` from the project root. The `--yes` flag skips the confirmation prompts.
2. Show the user the changelog entries the script added, so they can review or correct them in the database.
3. Prompt the user to test the build with `npm run build`. Do not run the build or any tests yourself.
4. When the user confirms, stage **only the seven files listed above** by explicit path (never `git add .`), and commit with the message `chore: bump version to v<new-version>`. Do not add a `Co-Authored-By` line.
5. Push to the remote. Vercel deploys automatically from `main`.
6. Do NOT create git tags unless the user explicitly asks.

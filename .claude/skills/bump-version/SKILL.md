---
name: bump-version
description: Bump the app version (patch/minor/major), commit, and push
disable-model-invocation: true
argument-hint: patch|minor|major
allowed-tools: Bash(node scripts/bump-version.mjs:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git tag:*)
---

# Bump Version Skill

Bump the HiveCraic app version using semantic versioning.

## Arguments

`$ARGUMENTS` should be one of: `patch`, `minor`, `major` (defaults to `patch` if empty).

## Steps

1. Run `node scripts/bump-version.mjs $ARGUMENTS --yes` from the project root to bump the version across all files (version.json, package.json, manifest.json, service-worker.js, login page, dashboard page, about page). The `--yes` flag skips confirmation prompts.

2. Prompt the user to test the build with `npm run build`.

3. When the user confirms, stage only the version-bumped files and commit with message: `chore: bump version to v<new-version>`

4. Push to the remote.

5. Do NOT create git tags unless the user explicitly asks.

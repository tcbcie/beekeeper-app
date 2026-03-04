# Feature: Start Production Launcher Script
**Date:** 02/03/2026
**Status:** Implemented

## 1. Overview
Add a dedicated Windows command script (`startprod.cmd`) that pre-compiles the Next.js application and then launches the local production server. This provides a predictable local workflow for testing production behaviour.

## 2. Scope & Simplicity
* **In Scope:** Add one new root-level script file and document the usage for local production launch.
* **Out of Scope:** Any changes to application source code, build configuration, environment management, or existing scripts (`start.cmd`, `startbuild.cmd`).
* **Existing Code Impact:** Minimal. Only one new command file is introduced; no existing code modules are modified.

## 3. Technical Design
### Architecture
The script will mirror the existing command-file style in the repository: clear stale build artefacts, execute `npm run build`, then execute `npm run start`.

### Database Connections (MCP Server)
No database queries or schema changes are required for this feature.

## 4. Edge Cases & Risks
* Build failures will stop the flow before server start, which is expected and desirable.
* If `.next` is locked by another process, clean-up may fail and the user will need to close active Node.js processes.
* `npm run start` requires a successful build output and valid runtime environment variables.

## 5. Implementation Phases
1. Phase 1: Add `startprod.cmd` with clean-build-start commands.
2. Phase 2: Confirm command syntax consistency and document usage.

## 6. Implementation Notes
* Added root script `startprod.cmd` with:
  * `if exist .next rmdir /s /q .next`
  * `npm run build`
  * `npm run start`
* Usage: run `startprod.cmd` from the repository root to pre-compile and launch local production mode in one step.

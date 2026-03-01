# Feature: Supabase CLI Temp Ignore Rule
**Date:** 01/03/2026
**Status:** Implemented

## 1. Overview
Keep the repository working tree clean by ignoring the local Supabase CLI temp marker file `supabase/.temp/cli-latest`.

## 2. Scope & Simplicity
* **In Scope:** Add a single explicit ignore entry for `supabase/.temp/cli-latest`.
* **Out of Scope:** Any broad ignore pattern changes, source-code changes, or Supabase runtime behaviour changes.
* **Existing Code Impact:** `.gitignore` only.

## 3. Technical Design
### Architecture
This is a repository hygiene update. Git ignore configuration is adjusted so this local temp artefact is not surfaced in routine status checks.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP interactions are required.

## 4. Edge Cases & Risks
* Overly broad ignore patterns could hide useful files; avoid this by using an exact path.
* If the file is already tracked in Git, ignore rules alone will not remove it from tracking.
* Ensure no other `supabase/.temp` files are unintentionally hidden unless explicitly intended.

## 5. Implementation Phases
1. Phase 1: Add an exact-path ignore rule for `supabase/.temp/cli-latest`.
2. Phase 2: Verify status output and document the change.

## 6. Implementation Notes
* Added `supabase/.temp/cli-latest` to `.gitignore`.
* Verified the ignore rule match with:
  * `git check-ignore -v --no-index supabase/.temp/cli-latest`
* Removed existing index tracking for the temp file with:
  * `git rm --cached supabase/.temp/cli-latest`
* Local file remains present on disk, but repository tracking is removed (effective after commit).
* No database, schema, or application runtime changes were made.

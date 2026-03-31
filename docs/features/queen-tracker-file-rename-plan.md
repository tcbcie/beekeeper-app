# Feature: Queen Tracker File Rename
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Bring the Queen Tracker naming into line with the current product language by removing the `Virgin` prefix from tracker-specific file names and implementation identifiers, then updating the linked documentation and references across the codebase. This keeps the tracker easier to find and avoids mixing the broader `Queen Tracker` label in the UI with older implementation names in code and docs.

## 2. Scope & Simplicity
* **In Scope:** Rename the tracker hook, tracker tab component, tracker feature documents, and the older tracker task note; update imports, internal references, and documentation labels that refer to this tracker feature.
* **Out of Scope:** Changing tracker behaviour, altering the underlying data model, renaming genuine biological references to virgin queens in unrelated flows, or rewriting broader queen-rearing terminology outside the tracker context.
* **Existing Code Impact:** Keep the change limited to the tracker source files, the batches page import, and the documentation or task files that explicitly reference the tracker by its current `Virgin` file name or feature label.

## 3. Technical Design
### Architecture
The tracker remains the same feature on `/dashboard/batches`. This pass only changes file names, exported identifiers, and references so the implementation terminology matches the user-facing `Queen Tracker` tab label.

### Database Connections (MCP Server)
No database query, schema, or MCP work is needed for this rename. The tracker data flow stays unchanged.

## 4. Edge Cases & Risks
* File renames need to be reflected in every import path and doc link, or the app will break at compile time.
* Some references to `virgin queen` describe lifecycle state or biology rather than the tracker feature, so those terms should not be blanket-replaced.
* Windows may hide case-only rename problems during local work, so the final file names should be changed clearly rather than relying on case-only edits.

## 5. Implementation Phases
1. Phase 1: Rename the tracker source files and exported identifiers, then repair all code imports.
2. Phase 2: Rename tracker documentation files and update references, while tightening tracker-specific wording to `Queen Tracker`.

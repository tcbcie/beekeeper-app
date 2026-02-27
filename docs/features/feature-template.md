# Feature: [Feature Name]
**Date:** [DD/MM/YYYY]
**Status:** [Draft / Approved / Implemented]

## 1. Overview
[Provide a clear, high-level summary of what this feature does and the value it brings. Use British English formatting.]

## 2. Scope & Simplicity
* **In Scope:** [What exactly are we building?]
* **Out of Scope:** [What are we strictly NOT building to keep this simple?]
* **Existing Code Impact:** [Which existing modules or files will this touch? Keep it minimal.]

## 3. Technical Design
### Architecture
[Briefly explain how this feature integrates with the existing system.]

### Database Connections (MCP Server)
[Detail any database queries, schema changes, or data retrieval needed. Note: Ensure all database interactions rely on direct connections via the MCP server, NOT parsed .sql files.]

## 4. Edge Cases & Risks
* [Identify potential bug sources]
* [Identify data validation concerns]
* [Identify how to handle failures gracefully]

## 5. Implementation Phases
[Break down the feature into small, logical milestones. These will later be converted into tasks/todo.md checklists.]
1. Phase 1: [Description]
2. Phase 2: [Description]
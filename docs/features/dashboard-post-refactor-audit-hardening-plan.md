# Feature: Dashboard Post-Refactor Audit Hardening
**Date:** 26/03/2026
**Status:** Draft

## 1. Overview
Harden the refactored dashboard client after commit `8bfb5c1` so it fails safely when RPC payloads are malformed, requests resolve out of order, or user/session state changes mid-load. The goal is to keep the dashboard accurate, resilient, and predictable without widening the feature scope.

## 2. Scope & Simplicity
* **In Scope:** Defensive normalisation of dashboard RPC responses, safe fallback state on partial failures, request-staleness guards for dashboard-related hooks, and minimal bootstrap hardening in the dashboard page.
* **Out of Scope:** Visual redesign, new dashboard features, SQL/RPC contract redesign, schema work, and any test-case or test-framework generation.
* **Existing Code Impact:** `src/hooks/useDashboardStats.ts`, `src/app/dashboard/page.tsx`, `src/hooks/useTeams.ts`, `src/hooks/useTicketStatus.ts`, and `src/hooks/useRearingGroups.ts`.

## 3. Technical Design
### Architecture
The hardening will stay inside the existing client-side dashboard boundary. The main hook will normalise RPC payloads before they reach render code, and each supporting hook will suppress stale async writes by tracking request lifecycles instead of assuming responses arrive in order. The dashboard page will keep the current layout and feature set, but its bootstrap flow will stop applying state after redirects or account changes.

### Database Connections (MCP Server)
No new database queries or schema changes are planned. Existing Supabase RPC and table calls will remain in place, and this audit will not rely on parsing saved `.sql` files.

## 4. Edge Cases & Risks
* RPC responses may be `null`, non-array, or structurally incomplete even when the HTTP request succeeds.
* Retry flows may currently re-expose stale dashboard data after session expiry or partial backend failures.
* Team, ticket, and rearing-group requests can resolve after a newer dashboard load and overwrite the current user’s state.
* Zero-result responses must clear prior badges and summary cards instead of silently preserving outdated values.

## 5. Implementation Phases
1. Phase 1: Harden `useDashboardStats` response validation and fallback state handling for overview and recent activity.
2. Phase 2: Harden dashboard page bootstrap and retry flows against stale auth and navigation races.
3. Phase 3: Add request-guard and state-reset protection to the related dashboard hooks for teams, tickets, and rearing groups.

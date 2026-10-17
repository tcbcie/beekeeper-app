# Full Application Audit: Plan

**Status:** Approved. Paused after Phase 1 fast-track; security hotfix batch 1 applied 15/10/2026, awaiting deploy and test
**Date:** 15/10/2026
**App version:** 1.12.1
**Checklist:** `tasks/full-app-audit-todo.html`
**Findings (when produced):** `docs/features/full-app-audit-report.md`

## Purpose

This is a single, read-only audit of the whole application, covering four areas:

1. **Best practice.** Every skill we are meant to apply: `qa-engineer`, `vercel-react-best-practices`, `ui`, `web-design-guidelines`, `ai tools` and `supabase-postgres-best-practices`. Also the project rules and the regression lessons kept in memory.
2. **Security.** The full attack surface: database, edge functions, API routes, PWA and headers, the AI assistant, secrets and dependencies.
3. **Mobile first and over-50s.** Compliance with the agreed accessibility and field-use rules.
4. **Mobile UI improvements.** Proposals, each becoming its own feature plan.

## Approach

- **Audit first, fix later.** Phases 1–4 produce findings only.
  - The exception is a confirmed Critical security issue. That gets reported straight away so a hotfix can be decided.
- **Multiple agents.** Each phase is split across parallel agents, one per code chunk (13 chunks, ~124k LOC). Agents build on existing `docs/features` work instead of repeating it.
- **Database checks.** These use read-only SQL over the Supabase MCP connection. The live DB is the source of truth because the repo's migrations have drifted.
- **Browser checks.** These are read-only navigation at 360×740 in Chrome, in light and dark.
- **Fixes.** These follow in small, separately approved batches. Each batch gets a `qa-engineer` audit, a docs update and a user build test.

## Phases

| Phase | Output |
|---|---|
| 0. Agree standards (decisions D1–D8) | One yardstick, recorded below |
| 1. Security (DB, edge functions, routes, PWA/headers, AI, secrets) | Security findings, verified or not |
| 2. Best-practice code audit (Batch 0 tooling + 13 chunks) | Code findings by severity, file:line |
| 3. Mobile-first / 50+ compliance (verification debt, field workflows, Queen Rearing, public trace pages) | Compliance findings + 360px screenshots |
| 4. Mobile UI improvement proposals | Candidate feature plans |
| 5. Report + remediation backlog + guidance-doc fixes | `full-app-audit-report.md` |

## Agreed standards (approved 15/10/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Touch-target minimum | 48px standard; 44px allowed only for compact/icon hit areas; 56px for primary field actions |
| D2 | Body/form text size | 14px floor everywhere; 16px for inputs, values and body copy in field workflows (elsewhere a 14px body is a Medium finding) |
| D3 | Dark-mode policy | In-app `.dark` toggle stays; the `ui` skill's time-based auto-switch rule is dropped |
| D4 | Copy style | British English, sentence case, straight quotes acceptable; Chicago Title Case / curly-quote rules ignored |
| D5 | Per-table data scoping map | Drafted in Phase 1 and confirmed by the owner; security findings judged against it |
| D6 | Schema source of truth | Live DB via MCP; repo migration drift is recorded as a finding |
| D7 | Account for browser checks | Demo account, read-only navigation (no saves/deletes) |
| D8 | Fast-track suspected security issues | Yes: the five suspicions are verified before the rest of the audit |

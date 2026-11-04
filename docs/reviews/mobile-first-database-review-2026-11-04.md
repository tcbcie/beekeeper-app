# Mobile-first review: live database evidence

**Date:** 04/11/2026. **Status:** Read-only review complete; implementation awaits approval.

## Scope and method

Inspected live columns, constraints, indexes, triggers, policies and function definitions through the Supabase MCP connection in read-only transactions with bounded statement timeouts. Compared these with two independent source reviews. Account data queries used owner-scoped aggregates; no personal notes, photographs or row identifiers are reproduced here. No saved SQL files were parsed. No data, schema, application code or dependencies changed; no builds run.

This supplements the original 39 findings in the [implementation plan](../features/mobile-first-50-plus-consolidated-implementation-plan-2026-11-04.md). It establishes model and calculation facts, not observed save reliability or participant behaviour. Owner-authored aggregates are not a complete inventory of shared-team records. Today's 22 active hives differ from the earlier screenshot's 21; these are different snapshots, not proof of a counting defect.

## DB01 - Unknown observations and rating meanings

**Priority: P1 interpretation; WP01/WP04.** Queen Seen and Eggs Present permit NULL in the database, but the current form starts at false, converts existing NULL to false on editing and saves unchecked as false. Therefore a negative value cannot reliably establish that the user explicitly checked and found nothing. The sampled 436 inspections contain no NULL for these two fields. Do not reinterpret historical false values or backfill them as unknown.

Core ratings use 0 for unrecorded and 1-5 for observations in the current client. Several database defaults are 3, but explicit client zeroes override those defaults. For example, 235 of 436 brood-pattern values and 423 of 436 recapping values are zero. These are not automatically invalid ratings. Core rating columns lack range CHECK constraints; this is a model-hardening candidate, not evidence of out-of-range data in the sample.

Live column comments establish calmness from 1 Very Nervous to 5 Very Calm, and swarming tendency from 1 Very Low to 5 Very High. They confirm 0 Not Recorded for recapping, VSH and SMR. Other rating anchors still need product/domain agreement; do not invent meanings. The form exposes star numbers and pressed state to assistive technology but lacks visible semantic anchors. Selection scoring already treats low swarming/chalkbrood as favourable.

Additional inconsistencies warrant focused tests: queen averages include zeroes while hive averages and selection scoring exclude them; editing one super's fullness can turn unrecorded sibling values into zero. Drones/propolis use -1 in the form and convert it to NULL on save; 65 stored propolis values of -1 indicate an additional historical representation, not proof of corruption. Drone-brood NULL and false both render unchecked.

**Implementation acceptance:** agree a field-by-field unknown/negative/zero contract before changing controls; preserve old observations; label established scales; exclude unrecorded ratings consistently from derived summaries after verifying intended rules. Any historical repair, default alignment or constraint migration needs a separate concrete proposal and approval.

**Source:** `src/types/records.ts:466`; `src/app/dashboard/records/page.tsx:326`, `:938`; `src/components/records/forms/InspectionForm.tsx:704`, `:1332`, `:1646`; `src/hooks/useQueenDetail.ts:112`; `src/hooks/useHiveDetail.ts:212`; `src/lib/selection-scoring.ts:16`.

## DB02 - Inspection age and activity are different measures

**Priority: P1 meaning; WP09.** Hive list/card badges use the latest inspection date. The live dashboard function's latest visit includes inspection, feeding, treatment, varroa check and harvest. A new feed can therefore update visit recency without changing inspection age. In the scoped active-hive sample, five hives have feeding newer than inspection.

The live overdue-inspection comparison is strictly older than 14 calendar days, or no inspection. Dashboard visit suggestions use visit recency and are suppressed November-February. Do not describe all these measures as one inspection schedule. Hive date ordering uses inspection date then ID rather than inspection time for same-day ties; inspect ties before promising chronological latest-observation semantics.

**Implementation acceptance:** visibly distinguish Last inspection, Last activity and observation dates; preserve existing thresholds pending a separate domain decision. Test missing dates, same-day observations, winter suppression and Europe/Dublin day boundaries.

**Source:** live `get_dashboard_overview`; `src/hooks/useHivesList.ts:169`, `:299`, `:404`; `src/lib/dashboard-todo.ts:45`.

## DB03 - Job totals count groups and concerns

**Priority: P1 meaning; WP09.** Dashboard/apiary pills count generated items. All eligible due tasks at an apiary form one job, while each queenless, queen-check or high-varroa entry can add another. Categories are not deduplicated by hive. Old-queen advice does not count. Apiary detail expands individual open tasks, including future tasks, so its total need not match the dashboard.

The live due-task query requires incomplete, apiary-linked, non-batch records due by today, but does not filter event_type. The scoped snapshot contains 19 eligible records and zero eligible non-task events. This is a latent classification question, not an observed event-count bug. Two active hives are flagged queenless; flag-based concerns have navigation actions rather than task completion state.

**Implementation acceptance:** explain grouped task and concern counts, distinguish recorded concerns from suggestions, and state how each resolves. Decide whether events should qualify before altering the query. Do not promise that completing one task clears an independent colony concern.

**Source:** live `get_dashboard_overview`; `src/lib/dashboard-todo.ts:84`, `:160`; `src/components/dashboard/TodoList.tsx:73`; `src/components/dashboard/ApiaryJobs.tsx:43`; `src/hooks/useApiaryJobs.ts:47`.

## DB04 - Stores are dated estimates, with a real zero

**Priority: P1 meaning; WP04/WP09.** The schema explicitly distinguishes NULL (not recorded) from 0 and restricts stores_level to 0-100. Of 436 scoped inspections, 18 have readings, ranging from 30 to 100; 418 have none. All observed readings are multiples of five. Four active hives have no stores observation, and two have a stores observation older than their latest inspection.

The current control records steps of five; Record stores seeds the previous value or 50. Merely accepting that seed is not an independently measured value. Current thresholds are below 40 Low, 40-79 Top up and at least 80 Enough. The form explains 100 as enough for winter, about 18 kg. Hive cards carry the latest non-null reading since 1 August and hide the dial May-July and for archived hives. This is a seasonal estimate, not live weight or super fullness.

**Implementation acceptance:** preserve NULL versus zero, retain observation date, make carried-forward/default values apparent, and explain the existing scale without inventing new feeding guidance. Test stale, absent and zero readings separately.

**Source:** live inspections metadata; `src/lib/stores-level.ts:6`; `src/components/records/forms/InspectionForm.tsx:2026`, `:2041`; `src/hooks/useHivesList.ts:382`; `src/components/hive/HiveListCard.tsx:83`.

## DB05 - Retry protection is partial, not a complete transaction

**Priority: P1 delivery integrity; WP01-WP03 and WP12.** Persisted queue entries retain inspection/task UUIDs. Live primary-key uniqueness and reuse of these IDs protect retries of those rows. The code treats duplicate-key responses as success without comparing stored content. Same-hive/date uniqueness is absent and is not inherently a defect: multiple observations can be legitimate.

The inspection, attachments, super adjustment and follow-up tasks are separate steps. If local queue persistence fails, another submission generates fresh IDs; an earlier commit with a lost response could then produce a duplicate. This is a code-established failure scenario, not a claim that duplicate records were observed.

The super adjustment clears its local pending delta before the RPC. A crash in between can omit the adjustment. Swallowed progress-write failures can also allow a later repeat. The live `adjust_hive_honey_supers` function locks the hive row and atomically applies a non-negative count, but accepts no operation ID and has no replay ledger. Row locking prevents concurrent lost increments; it does not make replay idempotent. The function was inspected, not executed.

A definitive follow-up-task refusal produces a warning while allowing the queue entry to be removed. Thus inspection saved does not mean all requested tasks were created. The live inspections table has no updated_at/version column; no database optimistic-concurrency mechanism was established for edits. RLS is enabled on inspections, hives, feedings and tasks_events, with owner/shared-access policies, but privileged metadata reads do not prove client isolation or conflict handling.

**Implementation acceptance:** use disposable fixtures to test lost responses, unavailable/full IndexedDB, progress-write failures, crash windows, repeated submission, concurrent tabs and edit conflicts. Preserve operation identity during uncertain outcomes; expose partial completion and recovery. Do not add automatic super-RPC retries without an idempotency design. If an operation ledger or transactional save RPC is needed, prepare a separate migration proposal for approval. Do not claim exactly-once delivery from primary keys alone.

**Source:** `src/app/dashboard/records/page.tsx:840`; `src/lib/inspection-outbox.ts:78`, `:127`, `:150`, `:174`, `:193`, `:211`; live primary keys, triggers and `adjust_hive_honey_supers` definition.

## Remaining evidence and delivery order

1. First expand WP01's disposable-fixture matrix with DB05 failure cases and DB01 value contracts. No production mutation tests are authorised by this review.
2. Resolve save-state truthfulness and recovery in WP02/WP03 before broadening automatic retries. Separate database changes from existing approval scope.
3. Apply supported labels and scale meanings in WP04/WP09; validate derived summaries before changing their behaviour.
4. Continue planned contrast, reflow and visual consistency work. Database evidence neither replaces rendered-screen checks nor demonstrates usability for the 50+ cohort.
5. Conduct the planned real-device field study. No participant sessions, offline-failure experiments or authenticated write journeys were performed in this review.

# Security Batch 12: Mel's Pipeline and Supply Chain

**Status:** Done 18/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch12-todo.html`
**Findings:** AI-05, AI-06, AI-08, SUP-07, SUP-08, SUP-09 (Medium), SUP-10. These are the last Phase 1 findings.
**Already closed earlier:** AI-02, AI-03 and AI-04 (batch 8), AI-07 (batch 7), AI-09 (batch 11).

## Mel (`src/lib/ai/tools`, `src/lib/rag.ts`)

- **AI-05:** `escapeLike()` in `utils.ts` caps AI-written search text at 100 characters and escapes LIKE wildcards. It is used by `findHiveByName`, `findQueenByNumber`, `findBatchByName`, and by the colony, hive, nuc and container look-ups. The honey-batch `batchCode` (which goes into a PostgREST `.or()` filter) must match `^[A-Za-z0-9-]+$` and be at most 40 characters.
- **AI-06:** the context (tool results and knowledge-base chunks) goes inside a `<records>…</records>` block in the system prompt. Mel is told it is information only and that instructions inside it must never be followed. Any `<records>` tags inside the data are stripped, so the data can't close the block early. Mel's tools are read-only; there are no writes or external actions.
- **AI-08:** `logToolError(error)` logs the database error on the server and returns "a database error occurred" to the model. It is used in all 48 tool error strings. The dispatcher (`index.ts`) no longer returns exception or Zod text.
- **New tools** should use `escapeLike()` for AI-written search text and `logToolError()` for errors. See `.claude/skills/ai tools/Skill.md`.

## Repository hygiene

- **`.gitignore`:**
  - `supabase/.temp/` is ignored, and its 7 files are untracked (project ref, pooler host).
  - New patterns: `*export*.sql`, `*backup*.sql`, `*.dump`, `*.key`, `*.p12`, `*.pfx`, `backups/`.
  - `!.env.example` lets the placeholder template be committed.
  - `external_references/Emails_Beekeeping_Associations.csv` is ignored and untracked (SUP-07, owner decision). Earlier copies remain in git history.
- **Secret scanner (`scripts/check-secrets.mjs`):**
  - It now also detects Supabase `sbp_`, Stripe test, restricted and webhook keys, Resend `re_`, OpenAI and Anthropic keys, Google `AIza`, Mapbox `sk.eyJ`, AWS `AKIA` and `ASIA`, GitHub tokens, encrypted private keys, connection strings with passwords, and env-style `*_SECRET`, `*_TOKEN` or `*_API_KEY` assignments that hold a real-looking value.
  - It blocks **new `.sql`/`.csv` files** outside `DATA_FILE_ALLOWLIST` (supabase/migrations, the legacy migrations folders, three reference CSVs) and any added or changed file **over 1 MB**.
  - `--range A..B` scans a commit range, and GitHub Actions uses it, so `git commit --no-verify` no longer gets past.
  - A deliberate occurrence can be allowed with `secret-scan-ignore` on the same line.
- **GitHub Actions (`.github/workflows/test.yml`):**
  - Top-level `permissions: contents: read`; the test job adds `pull-requests: write` for its comment.
  - All actions are pinned to the commit of a released tag: checkout v4.4.0, setup-node v4.4.0, codecov-action v4.6.0, github-script v7.1.0.
  - A new `secret-scan` job runs the scanner over the PR range, or over the pushed range (`before..sha`).

## npm audit

- `brace-expansion` went from 1.1.12 to 1.1.21, a non-breaking fix.
- Production findings fell from 5 to 4, with no criticals: `next` and its bundled `postcss` are only fixed in Next 16, and `exceljs` and `uuid` only by a breaking downgrade.
- The 4 critical findings are dev-only (Vitest 2 and its UI, coverage and `tinypool` packages). The fix is Vitest 5, a major upgrade, to be done separately.
- Lesson: `npm audit fix --omit=dev` also prunes dev dependencies from `node_modules`. Run `npm install` afterwards, or use plain `npm audit fix`.

## Verification

- Scanner tests in throwaway repos with fake, generated values: all 9 key types were blocked; placeholder and `process.env` lines passed; a new root `.sql` file and a 1.1 MB file were blocked; a migration `.sql` passed; and range mode caught a secret committed with `--no-verify`.
- `escapeLike` was checked on `%`, `_`, `50%` and a backslash.
- No type errors; ESLint is clean on the changed files.

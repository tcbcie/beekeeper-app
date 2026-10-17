# Security Batch 8: AI Tools Under Database Rules

**Status:** Done 17/10/2026. The owner tested Mel; committed and pushed.
**Checklist:** `tasks/security-batch8-todo.html`
**Finding:** AI-01 (Medium). Also fixes the clash between the two `getBatchDetails` tools.

## Problem

All 55 of Mel's data tools used one secret-key client (`getSupabase()` in `src/lib/ai/tools/utils.ts`), so RLS didn't apply and each tool's own `user_id` filter was the only protection. `getColonyDetails` and `getColonyLineage` looked up parent and child colonies without that filter, so other users' colony numbers could appear in answers.

## Change

- **`src/lib/ai/tools/utils.ts`:**
  - `createUserSupabase(accessToken)` returns a client using the public key and `Authorization: Bearer <user token>`.
  - `runWithUserSupabase(client, fn)` makes that client the request's client, using Node `AsyncLocalStorage`.
  - `getSupabase()` returns the request's user client and **throws** if there isn't one. There is no fallback to the secret key.
  - `getServiceSupabase()` is a clearly named secret-key client. It is used only for the caller's own BEEP/Wolf token, because those columns aren't readable through RLS.
- **`src/app/api/chat/route.ts`:** runs `handleChatQuery` inside `runWithUserSupabase(createUserSupabase(token), …)`, using the same token the route has just verified.
- **Tools:** unchanged, and they keep their explicit filters. RLS is wider than "my apiaries" (for example, it also shows distribution recipients' apiaries), so the filters still define what Mel talks about, and RLS is the safety net.
- **Unchanged in `src/lib/rag.ts`:** the knowledge base and news search (shared content) and the `tool_suggestions` insert (admin analytics; only the secret key may insert). None of them return other users' data.
- **AI-written SQL:** no code path runs it. `execute_safe_query` is executable only with the secret key, and only the admin export uses it, with fixed queries.

## getBatchDetails clash

`queens.ts` and `traceability.ts` both exported `getBatchDetails`. The registry spreads every module, so the traceability tool replaced the queen-rearing one. The queen-rearing tool is now `getRearingBatchDetails`, and the traceability description says "honey bottling batch".

## Docs

- The project skill `.claude/skills/ai tools/Skill.md` now shows the real pattern: the `Tool` type, the `getSupabase()` user client, and unique export names. Before, it pointed to a non-existent `@/lib/supabase/server`.
- `queen-rearing.md` lists the renamed tool.

## Verification

- No type errors in `src/`, and ESLint is clean on `src/lib/ai/tools` and the chat route.
- The tools only read `profiles.role` (granted) and, through the secret key, the caller's own tokens. No tool writes anything.
- The owner tested Mel with real questions (hives, inspections, varroa, rearing and bottling batches, scales, colony lineage, knowledge, shared hives).

# Mel: questions that need both records and advice

**Date:** 12 November 2026
**Status:** Implemented

## 1. Overview

Mel sorts every question into one of four kinds (`classifyQuery` in `src/lib/openai.ts`):

| Kind | Example | What Mel looks up |
|------|---------|-------------------|
| `sql` | "When did I last inspect hive 4?" | The user's records, through one tool |
| `knowledge` | "How do I treat for varroa in autumn?" | The knowledge base, with citations |
| `hybrid` | "Hive 4 has 6% mites, what should I do?" | Both |
| `general` | "Hello" | Nothing |

Until this change a `hybrid` question was treated as `knowledge`, so the user's own records were never looked up.

## 2. How it works

`handleChatQuery` in `src/lib/rag.ts`:

- For `hybrid`, the knowledge-base search and the records lookup run together (`Promise.all`).
- The records lookup is the same one the `sql` path uses (`lookUpRecords`): the tool router picks one tool, and the tool runs as the user, so tenancy rules are unchanged.
- The records come first in the context given to the model, then the knowledge-base results. Sources are listed from the knowledge-base results as before.

## 3. When a lookup finds nothing or fails

The records side of a hybrid question is best effort:

- No tool fits: Mel answers from the knowledge base alone, as it did before this change.
- The lookup fails: Mel is told the records could not be read, says so, and answers from the knowledge base alone.
- The knowledge-base search fails: Mel answers from the records alone.
- Neither finds anything: Mel gives a general answer.

A hybrid question does not log a tool suggestion and never returns the "I don't have that information" reply; those stay on the `sql` path.

## 4. Cost

One extra small model call (the tool router) on hybrid questions only.

## 5. Out of scope

- More than one tool per question.
- Mel writing records (it remains read-only).

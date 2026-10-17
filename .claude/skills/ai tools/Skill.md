# Skill: Creating Safe Backend Tools for the AI Assistant

## Description
This skill defines the framework for creating backend "tools" (functions) that the AI assistant can execute. These tools act as the secure bridge between the LLM's intent and the Supabase database.

## Core Principles & Constraints

When creating a new tool, you **MUST** adhere to these non-negotiable rules to ensure security and usability:

1.  **Strict Tenancy Isolation (CRITICAL):**
    * The LLM is never allowed to see data outside the current user's scope.
    * Always get the database client from `getSupabase()` in `src/lib/ai/tools/utils.ts`. It is the signed-in user's own client (set per chat request by `runWithUserSupabase` in `src/app/api/chat/route.ts`), so the database's RLS rules apply. Never create a secret-key client in a tool.
    * Still filter every query by the current user (`.eq('user_id', userId)` or the `getOwnApiaryIds` / `getAccessibleApiaryIds` / `getAccessibleHiveIds` helpers). RLS is wider than "my apiaries" (it also shows, for example, distribution recipients' apiaries), so the filters define what Mel should talk about.
    * The user ID comes from the `userId` argument the dispatcher passes in, NEVER from an LLM parameter.
    * `getServiceSupabase()` (secret key) is only for data the caller may not read through RLS but a tool needs for themselves, such as their own BEEP/Wolf token. Never use it for rows chosen by tool arguments.

2.  **Human-Readable Outputs:**
    * Never return raw database UUIDs to the LLM. The LLM cannot use them effectively and might expose them to the user.
    * Always perform SQL `JOINs` in your Supabase query to retrieve human-readable names associated with IDs (e.g., join `hives` to get `hive_name` and `hive_number`).

3.  **Zod Schema Validation:**
    * All inputs expected from the LLM must be defined and validated using a strict Zod schema in the `parameters` property.

4.  **Graceful Failure:**
    * The `execute` function should handle cases where data is not found gracefully, returning a descriptive string rather than throwing an unhandled error or returning null.
Only use data either based on the users data or on the Knowledge in the database. Never use any data that is part of the model.

## Tool Structure Template

All tools must follow this TypeScript structure, utilizing the project's tool definition helper (assumed to be based on Vercel AI SDK standards).

```typescript
import { z } from 'zod'
import type { Tool } from './index'
import { getSupabase } from './utils'

// 1. Export name = registry key = `name`. It must be unique across ALL tool files (the
//    registry spreads every module, so a duplicate silently replaces the earlier tool).
export const getExampleRecords: Tool = {
  name: 'getExampleRecords',
  description: 'A clear, concise description for the LLM telling it WHAT this tool does and WHEN to use it.',

  // 2. Parameters the LLM provides, validated by the dispatcher
  parameters: z.object({
    // parameterName: z.string().describe('Description of parameter purpose'),
  }),

  // 3. The execution logic: userId is the authenticated caller, never an LLM argument
  execute: async (_rawArgs: unknown, userId: string) => {
    const supabase = getSupabase() // the user's own client: RLS applies

    const { data, error } = await supabase
      .from('your_table_name')
      .select('field1, field2, joined_table(name_field)')
      .eq('user_id', userId) // still scope explicitly
      .limit(20)

    if (error) {
      console.error('Tool execution error:', error)
      return 'An error occurred while attempting to fetch the data.'
    }
    if (!data || data.length === 0) {
      return 'No relevant data found matching that request.'
    }

    // Human-readable output for the LLM. NO UUIDs.
    return data.map((row) => ({
      readableField1: row.field1,
    }))
  },
}
```
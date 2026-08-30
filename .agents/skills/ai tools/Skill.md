# Skill: Creating Safe Backend Tools for the AI Assistant

## Description
This skill defines the framework for creating backend "tools" (functions) that the AI assistant can execute. These tools act as the secure bridge between the LLM's intent and the Supabase database.

## Core Principles & Constraints

When creating a new tool, you **MUST** adhere to these non-negotiable rules to ensure security and usability:

1.  **Strict Tenancy Isolation (CRITICAL):**
    * The LLM is never allowed to see data outside the current user's scope.
    * Every database query executed within a tool **MUST** include a filter using the current user's ID.
    * The user ID must be retrieved from the execution context (e.g., session context), NEVER from an LLM parameter.
    * *Pattern:* `.eq('user_id', context.session.user.id)`

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
import { z } from 'zod';
// Import necessary project types for context, e.g.:
// import { ToolExecutionOptions } from '@/lib/ai/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 1. Define descriptive name and what the tool does
export const toolName = defineTool({
  description: 'A clear, concise description for the LLM telling it WHAT this tool does and WHEN to use it.',

  // 2. Define parameters the LLM needs to provide via Zod
  parameters: z.object({
    // Example: parameterName: z.string().describe('Description of parameter purpose'),
    // If no parameters are needed, use z.object({})
  }),

  // 3. The execution logic
  execute: async (args, options: ToolExecutionOptions) => {
    // 3a. Secure Context Retrieval
    const { context } = options;
    // Ensure session exists before proceeding (middleware should usually handle this, but be safe)
    if (!context?.session?.user?.id) {
      return "Error: Unauthorized execution context.";
    }
    const userId = context.session.user.id;

    // Initialize DB client
    const supabase = createSupabaseServerClient();

    try {
      // 3b. Secure Database Query
      const { data, error } = await supabase
        .from('your_table_name')
        .select('field1, field2, joined_table(name_field)')
        // CRITICAL: Tenancy enforcement
        .eq('user_id', userId)
        // Apply any filters based on args
        // .eq('some_col', args.parameterName)
        .single(); // or .limit(x) depending on needs

      if (error) throw error;

      // 3c. Graceful Handling
      if (!data) {
        return "No relevant data found matching that request.";
      }

      // 3d. Formatted Human-Readable Output
      // Transform DB result into simple JSON for the LLM. NO UUIDs.
      return {
        readableField1: data.field1,
        relatedName: data.joined_table?.name_field ?? 'Unknown',
        // ...
      };

    } catch (err) {
      // Log error centrally if needed
      console.error('Tool execution error:', err);
      // Return safe error message to LLM
      return "An error occurred while attempting to fetch the data.";
    }
  },
});
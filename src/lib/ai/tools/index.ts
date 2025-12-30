import { z } from 'zod'

// Tool definition type - uses unknown for args to allow registry storage
export interface Tool {
  name: string
  description: string
  parameters: z.ZodType
  execute: (args: unknown, userId: string) => Promise<unknown>
}

// Tool result type - either structured data or error string
export type ToolResult = Record<string, unknown> | Record<string, unknown>[] | string

// Import all tools
import * as hiveTools from './hives'
import * as inspectionTools from './inspections'
import * as varroaTools from './varroa'
import * as feedingTools from './feeding'
import * as queenTools from './queens'
import * as taskTools from './tasks'
import * as analysisTools from './analysis'
import * as knowledgeTools from './knowledge'
import * as colonyTools from './colonies'

// Combine all tools into registry
export const tools: Record<string, Tool> = {
  // Hive tools
  ...hiveTools,
  // Inspection tools
  ...inspectionTools,
  // Varroa tools
  ...varroaTools,
  // Feeding tools
  ...feedingTools,
  // Queen tools
  ...queenTools,
  // Task tools
  ...taskTools,
  // Analysis tools
  ...analysisTools,
  // Knowledge tools
  ...knowledgeTools,
  // Colony tools
  ...colonyTools,
}

// Get tool by name
export function getTool(name: string): Tool | undefined {
  return tools[name]
}

// Get all tool names and descriptions for LLM context
export function getToolDescriptions(): string {
  return Object.entries(tools)
    .map(([name, tool]) => `- ${name}: ${tool.description}`)
    .join('\n')
}

// Execute a tool by name
export async function executeTool(
  name: string,
  args: unknown,
  userId: string
): Promise<ToolResult> {
  const tool = getTool(name)
  if (!tool) {
    return `Tool "${name}" not found`
  }

  // Validate args
  const parsed = tool.parameters.safeParse(args)
  if (!parsed.success) {
    return `Invalid arguments: ${parsed.error.message}`
  }

  try {
    const result = await tool.execute(parsed.data, userId)
    return result as ToolResult
  } catch (error) {
    console.error(`Tool ${name} execution error:`, error)
    return `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

export { hiveTools, inspectionTools, varroaTools, feedingTools, queenTools, taskTools, analysisTools, knowledgeTools, colonyTools }

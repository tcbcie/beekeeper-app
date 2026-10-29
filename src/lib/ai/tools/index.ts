import { z } from 'zod'
import { AmbiguousMatchError } from './utils'

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
import * as scaleTools from './scales'
import * as nucTools from './nucs'
import * as harvestTools from './harvests'
import * as traceabilityTools from './traceability'

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
  // Scale tools (BEEP and Wolf Waagen)
  ...scaleTools,
  // Mating nuc tools
  ...nucTools,
  // Harvest tools
  ...harvestTools,
  // Traceability tools (bulk containers + batch runs)
  ...traceabilityTools,
}

// What executeTool returns when a tool failed. The chat handler answers "couldn't look that up"
// itself rather than passing this to the model as data.
export const TOOL_FAILED = 'The lookup failed.'

// Get tool by name. Own keys only, so a name like "constructor" or "toString" is not a tool.
export function getTool(name: string): Tool | undefined {
  return Object.hasOwn(tools, name) ? tools[name] : undefined
}

// Get all tool names, descriptions and parameter names for LLM context, so the router only
// sends arguments the tool actually takes.
export function getToolDescriptions(): string {
  return Object.entries(tools)
    .map(([name, tool]) => {
      const shape = tool.parameters instanceof z.ZodObject ? Object.keys(tool.parameters.shape) : []
      return `- ${name}(${shape.join(', ')}): ${tool.description}`
    })
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

  // Validate args. The model often writes null for a parameter it has no value for; treat that
  // as "not given" so an optional parameter doesn't fail the whole lookup.
  const given = args && typeof args === 'object' && !Array.isArray(args)
    ? Object.fromEntries(Object.entries(args).filter(([, value]) => value !== null))
    : args
  const parsed = tool.parameters.safeParse(given)
  if (!parsed.success) {
    console.error(`Tool ${name} rejected its arguments:`, parsed.error.message)
    return `Invalid arguments for ${name}`
  }

  try {
    const result = await tool.execute(parsed.data, userId)
    return result as ToolResult
  } catch (error) {
    // Several records fit the label the user gave: hand back the "which one?" question.
    if (error instanceof AmbiguousMatchError) return error.message
    console.error(`Tool ${name} execution error:`, error)
    // The detail is logged above; the model only learns that the tool failed.
    return TOOL_FAILED
  }
}

export { hiveTools, inspectionTools, varroaTools, feedingTools, queenTools, taskTools, analysisTools, knowledgeTools, colonyTools, scaleTools, nucTools, harvestTools, traceabilityTools }

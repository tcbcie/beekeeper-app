import { generateChatResponse, generateEmbedding, classifyQuery } from './openai'
import { createClient } from '@supabase/supabase-js'
import { tools, executeTool, getToolDescriptions } from './ai/tools'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

// Fail-fast at module init. Helper returns a non-nullable string so the
// values can be used inside any closure without TS narrowing surprises.
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`rag: ${name} must be set.`)
  }
  return value
}
const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseServiceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

export function getServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Match user query to a tool using LLM
async function matchQueryToTool(query: string): Promise<{
  toolName: string | null
  args: Record<string, unknown>
} | null> {
  const toolList = getToolDescriptions()

  const currentYear = new Date().getFullYear()
  const systemPrompt = `You are a tool router for a beekeeping app. Given a user query, determine if any of the available tools can answer it.

Current year: ${currentYear}

Available tools:
${toolList}

RULES:
1. If a tool matches, return JSON: {"toolName": "tool_name", "args": {}}
2. Extract ALL parameters from the query including: hive names, numbers, years, dates, limits
3. IMPORTANT: If the user mentions a specific year (e.g. "in 2025", "for 2024"), ALWAYS include it as {"year": YYYY} in args
4. If no tool matches well, return: {"toolName": null, "args": {}}
5. Return ONLY valid JSON, nothing else`

  try {
    const response = await generateChatResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], 'gpt-4o-mini')

    // Clean response - remove markdown code blocks if present
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```(?:json)?\s*\n?/, '')
      cleanResponse = cleanResponse.replace(/\n?```\s*$/, '')
    }

    const result = JSON.parse(cleanResponse)
    return result
  } catch (error) {
    console.error('Tool matching error:', error)
    return null
  }
}

// Format a citation from source data (with optional URL as markdown link)
export function formatCitation(source: {
  source_name?: string | null
  source_author?: string | null
  source_year?: number | null
  source_url?: string | null
}): string {
  const { source_name, source_author, source_year, source_url } = source

  // Build the citation text
  let citation = ''

  if (source_author && source_year && source_name) {
    citation = `${source_author} (${source_year}). ${source_name}`
  } else if (source_author && source_name) {
    citation = `${source_author}. ${source_name}`
  } else if (source_year && source_name) {
    citation = `${source_name} (${source_year})`
  } else if (source_name) {
    citation = source_name
  } else {
    citation = 'Knowledge Base'
  }

  // Wrap in markdown link if URL is available
  if (source_url) {
    return `[${citation}](${source_url})`
  }

  return citation
}

// Knowledge base search result type
export interface KnowledgeSearchResult {
  content: string
  metadata: Record<string, unknown>
  similarity: number
  source_name: string | null
  source_author: string | null
  source_year: number | null
  source_url: string | null
  citation: string
}

// Search knowledge base using vector similarity
export async function searchKnowledgeBase(query: string, limit: number = 5): Promise<KnowledgeSearchResult[]> {
  const supabase = getServerSupabase()
  const embedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: embedding,
    match_threshold: 0.5, // Lower threshold to catch more relevant content
    match_count: limit
  })

  if (error) {
    console.error('Knowledge base search error:', error)
    return []
  }

  // Add formatted citation to each result
  return (data || []).map((r: {
    content: string
    metadata: Record<string, unknown>
    similarity: number
    source_name: string | null
    source_author: string | null
    source_year: number | null
    source_url: string | null
  }) => ({
    ...r,
    citation: formatCitation(r)
  }))
}

// News article search result type
export interface NewsSearchResult {
  article_id: string
  title: string
  description: string | null
  url: string
  image_url: string | null
  site_name: string | null
  published_date: string | null
  author: string | null
  created_at: string
  similarity: number
  matched_content: string
}

// Search news articles using vector similarity (semantic search)
export async function searchNewsArticles(query: string, limit: number = 10): Promise<NewsSearchResult[]> {
  const supabase = getServerSupabase()
  const embedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('search_news_articles', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: limit
  })

  if (error) {
    console.error('News search error:', error)
    return []
  }

  return data || []
}

// LLM-generated SQL fallback was removed as part of the security audit.
//
// Previously this file exported generateSQLQuery() and executeQuery() which
// together ran LLM-emitted SELECT statements via the public.execute_safe_query
// RPC. That RPC is SECURITY DEFINER and does not enforce a user_id WHERE
// clause at the data layer -- the system prompt asked the LLM to add one,
// but prompt-injection could bypass the instruction and return cross-user
// data. The RPC's keyword regex was also bypassable (pg_catalog reads,
// pg_sleep, WITH-CTE forms).
//
// The structured ai/tools/* path is now the only data path from chat. Each
// tool has explicit user_id scoping in its contract. Queries that no tool
// covers are logged for tool-gap analysis and answered as "no data".
//
// public.execute_safe_query is retained because /api/admin/export-all-data
// still uses it for hardcoded schema-metadata queries (not LLM output).

// Log queries that no tool covered, for developer insight into tool gaps.
async function logToolSuggestion(query: string, userId: string) {
  try {
    const supabase = getServerSupabase()
    await supabase.from('tool_suggestions').insert({
      query,
      generated_sql: null,
      had_results: false,
      user_id: userId
    })
  } catch (error) {
    // Silent fail - this is just analytics
    console.error('Failed to log tool suggestion:', error)
  }
}

// Main RAG handler - orchestrates the entire chat flow
export async function handleChatQuery(
  query: string,
  userId: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{
  response: string
  intent: 'sql' | 'knowledge' | 'hybrid' | 'general'
  sources?: string[]
}> {
  // Validate userId to prevent injection
  if (!isValidUUID(userId)) {
    throw new Error('Invalid user ID format')
  }

  // Step 1: Classify the query
  const classification = await classifyQuery(query)

  // Step 2: Route to appropriate handler
  let context = ''
  let sources: string[] = []

  switch (classification.intent) {
    case 'knowledge': {
      // Search knowledge base
      const results = await searchKnowledgeBase(query)
      if (results.length > 0) {
        // Format context with proper citations from source table
        context = `KNOWLEDGE BASE RESULTS:\n\n${results.map((r) => {
          const pageNum = (r.metadata as { loc?: { pageNumber?: number } })?.loc?.pageNumber
          const pageInfo = pageNum ? ` (page ${pageNum})` : ''
          return `--- Source: ${r.citation}${pageInfo} ---\n${r.content}`
        }).join('\n\n')}`
        sources = results.map(r => r.citation).filter(Boolean)
      }
      break
    }

    case 'sql': {
      // Tools-only path. The LLM-SQL fallback was removed in the audit
      // (see the note above logToolSuggestion). If no tool matches, the
      // query is logged for tool-gap analysis and the user gets a "no
      // data" response -- no free-form SQL ever reaches the database.
      const toolMatch = await matchQueryToTool(query)

      if (toolMatch?.toolName && tools[toolMatch.toolName]) {
        try {
          const toolResult = await executeTool(toolMatch.toolName, toolMatch.args, userId)
          if (typeof toolResult === 'string') {
            context = toolResult
          } else {
            context = `Here is the data from your records:\n\n${JSON.stringify(toolResult, null, 2)}\n\nUse this data to answer the user's question directly.`
          }
        } catch (error) {
          console.error('Tool execution error:', error)
        }
      }

      if (!context) {
        // No tool covered this query (or the tool threw). Log for tool-gap
        // analysis and tell the user we don't have that data.
        logToolSuggestion(query, userId)
        context = `This question requires data that isn't available in your records.`
      }
      break
    }

    case 'hybrid': {
      // For now, treat hybrid as knowledge search
      const results = await searchKnowledgeBase(query)
      if (results.length > 0) {
        // Use same formatting as knowledge case
        context = `KNOWLEDGE BASE RESULTS:\n\n${results.map((r) => {
          const pageNum = (r.metadata as { loc?: { pageNumber?: number } })?.loc?.pageNumber
          const pageInfo = pageNum ? ` (page ${pageNum})` : ''
          return `--- Source: ${r.citation}${pageInfo} ---\n${r.content}`
        }).join('\n\n')}`
        sources = results.map(r => r.citation).filter(Boolean)
      }
      break
    }

    case 'general':
    default:
      // No special context needed for general queries
      break
  }

  // Step 3: Generate response
  const systemPrompt = `You are Mel, the friendly virtual assistant for HiveCraic, a beekeeping management app.
You help beekeepers with questions about their hives, inspections, and general beekeeping knowledge.

Be concise, friendly, and practical in your responses.
If you have specific data from the user's records, reference it directly.
For beekeeping advice, be accurate and mention if something is region-specific.

IMPORTANT: Always format dates in European format (DD/MM/YYYY or "8 Nov 2023"). Never use American MM/DD/YYYY format.

When answering from KNOWLEDGE BASE RESULTS:
- ALWAYS cite sources using the EXACT citation provided (preserve markdown links if present)
- If the citation is a markdown link like [Author (Year). Title](url), use it exactly as-is so it renders as a clickable link
- Example: "According to [Preuss (1919). Beekeeping Methods](https://example.com)..."
- Include page numbers when available
- Synthesize information if multiple sources agree
- If no relevant sources are found, say so and provide general guidance

${context ? `\nCONTEXT:\n${context}` : ''}`

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: query }
  ]

  const response = await generateChatResponse(messages, 'gpt-4o-mini')

  return {
    response,
    intent: classification.intent,
    sources: sources.length > 0 ? sources : undefined
  }
}

export { classifyQuery }

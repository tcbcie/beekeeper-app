import { generateChatResponse, generateEmbedding, classifyQuery } from './openai'
import { createClient } from '@supabase/supabase-js'
import DB_SCHEMA from './db-schema'
import { tools, executeTool, getToolDescriptions } from './ai/tools'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

// Create Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function getServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Match user query to a tool using LLM
async function matchQueryToTool(query: string): Promise<{
  toolName: string | null
  args: Record<string, unknown>
} | null> {
  const toolList = getToolDescriptions()

  const systemPrompt = `You are a tool router for a beekeeping app. Given a user query, determine if any of the available tools can answer it.

Available tools:
${toolList}

RULES:
1. If a tool matches, return JSON: {"toolName": "tool_name", "args": {}}
2. Extract any parameters from the query (hive names, numbers, limits, etc.)
3. If no tool matches well, return: {"toolName": null, "args": {}}
4. Return ONLY valid JSON, nothing else`

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

// Generate SQL query from natural language
export async function generateSQLQuery(query: string, userId: string): Promise<string> {
  // Validate userId to prevent SQL injection
  if (!isValidUUID(userId)) {
    throw new Error('Invalid user ID format')
  }

  const systemPrompt = `You are a SQL query generator for a PostgreSQL beekeeping database.
Given a user question, generate a safe SELECT query to answer it.

${DB_SCHEMA}

RULES:
1. ONLY generate SELECT queries (no INSERT, UPDATE, DELETE)
2. Always include WHERE user_id = '${userId}'
3. Use proper date formatting for PostgreSQL
4. Return ONLY the SQL query, nothing else
5. If the question cannot be answered with the schema, return "CANNOT_QUERY"
6. Limit results to 100 rows maximum
7. For "latest" or "recent", order by date DESC and limit appropriately`

  const response = await generateChatResponse([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 'gpt-4o-mini')

  return response.trim()
}

// Execute SQL query safely
export async function executeQuery(sql: string): Promise<{
  data: unknown[] | null
  error: string | null
}> {
  // Remove markdown code blocks if present (LLM sometimes wraps SQL in ```sql ... ```)
  let cleanSql = sql.trim()
  if (cleanSql.startsWith('```')) {
    // Remove opening code fence (```sql or ```)
    cleanSql = cleanSql.replace(/^```(?:sql)?\s*\n?/, '')
    // Remove closing code fence
    cleanSql = cleanSql.replace(/\n?```\s*$/, '')
    cleanSql = cleanSql.trim()
  }

  // Remove trailing semicolon (causes issues with RPC wrapper)
  if (cleanSql.endsWith(';')) {
    cleanSql = cleanSql.slice(0, -1)
  }

  // Validate query is SELECT only
  const normalizedSql = cleanSql.toUpperCase().trim()
  if (!normalizedSql.startsWith('SELECT')) {
    return { data: null, error: 'Only SELECT queries are allowed' }
  }

  // Check for dangerous patterns
  const dangerousPatterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', '--']
  for (const pattern of dangerousPatterns) {
    if (normalizedSql.includes(pattern)) {
      return { data: null, error: 'Query contains forbidden operations' }
    }
  }

  const supabase = getServerSupabase()

  // Use RPC to execute the query safely
  const { data, error } = await supabase.rpc('execute_safe_query', { query_text: cleanSql })

  if (error) {
    // If RPC doesn't exist, fall back to direct query (less safe, but works)
    console.warn('Safe query RPC not found, using direct query')
    // For now, return error - we'll implement the RPC later
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// Log queries that fell back to SQL (no dedicated tool) for developer insights
async function logToolSuggestion(query: string, generatedSql: string | null, hadResults: boolean, userId: string) {
  try {
    const supabase = getServerSupabase()
    await supabase.from('tool_suggestions').insert({
      query,
      generated_sql: generatedSql,
      had_results: hadResults,
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
      // Try tools first, then fall back to SQL generation
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
          // Fall through to SQL generation
        }
      }

      // Fall back to SQL generation if no tool matched or tool failed
      if (!context) {
        const sql = await generateSQLQuery(query, userId)
        if (sql && sql !== 'CANNOT_QUERY') {
          const result = await executeQuery(sql)
          const hadResults = !!(result.data && Array.isArray(result.data) && result.data.length > 0)

          // Log this SQL fallback for developer insights (helps identify needed tools)
          logToolSuggestion(query, sql, hadResults, userId)

          if (hadResults) {
            context = `Here is the data from your records:\n\n${JSON.stringify(result.data, null, 2)}\n\nUse this data to answer the user's question directly.`
          } else if (result.data && Array.isArray(result.data) && result.data.length === 0) {
            context = `I searched your records but found no matching data. The user may not have recorded this information yet.`
          } else if (result.error) {
            console.error('SQL execution error:', result.error)
            context = `I tried to look up your data but encountered an issue: ${result.error}. Let me answer based on general knowledge instead.`
          }
        } else {
          context = `This question requires data that isn't available in your records.`
        }
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

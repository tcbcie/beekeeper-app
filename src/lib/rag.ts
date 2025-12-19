import { generateChatResponse, generateEmbedding, classifyQuery } from './openai'
import { createClient } from '@supabase/supabase-js'
import DB_SCHEMA from './db-schema'

// Create Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function getServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Search knowledge base using vector similarity
export async function searchKnowledgeBase(query: string, limit: number = 5): Promise<{
  content: string
  metadata: Record<string, unknown>
  similarity: number
}[]> {
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

  return data || []
}

// Generate SQL query from natural language
export async function generateSQLQuery(query: string, userId: string): Promise<string> {
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
        context = `Relevant beekeeping information:\n\n${results.map(r => r.content).join('\n\n')}`
        sources = results.map(r => (r.metadata as { source?: string })?.source || 'Knowledge Base').filter(Boolean)
      }
      break
    }

    case 'sql': {
      // Generate and execute SQL query
      const sql = await generateSQLQuery(query, userId)
      console.log('Generated SQL:', sql)
      if (sql && sql !== 'CANNOT_QUERY') {
        const result = await executeQuery(sql)
        console.log('Query result:', result)
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
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
      break
    }

    case 'hybrid': {
      // For now, treat hybrid as knowledge search
      // We'll implement inspection notes search in Phase 4
      const results = await searchKnowledgeBase(query)
      if (results.length > 0) {
        context = `Relevant information:\n\n${results.map(r => r.content).join('\n\n')}`
      }
      break
    }

    case 'general':
    default:
      // No special context needed for general queries
      break
  }

  // Step 3: Generate response
  const systemPrompt = `You are a helpful AI assistant for HiveCraic, a beekeeping management app.
You help beekeepers with questions about their hives, inspections, and general beekeeping knowledge.

Be concise, friendly, and practical in your responses.
If you have specific data from the user's records, reference it directly.
For beekeeping advice, be accurate and mention if something is region-specific.

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

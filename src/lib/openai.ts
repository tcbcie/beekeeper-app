import OpenAI from 'openai'

// Lazy initialization of OpenAI client (server-side only)
let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// Generate embedding for text using OpenAI's embedding model
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  if (!response.data?.[0]?.embedding) {
    throw new Error('OpenAI embedding response contained no data')
  }
  return response.data[0].embedding
}

// Chat completion with specified model
export async function generateChatResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini'
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  })
  return response.choices?.[0]?.message?.content || ''
}

// Classify user query intent
export async function classifyQuery(query: string): Promise<{
  intent: 'sql' | 'knowledge' | 'hybrid' | 'general'
  confidence: number
}> {
  const systemPrompt = `You are a query classifier for a beekeeping app. Classify user queries into one of these categories:

1. "sql" - Questions about the user's OWN data that can be answered by querying their database.
   KEY SIGNALS: "my", "I have", "which hive", "which colony", "my varroa", "highest", "lowest", "most", "least", "how many", "when did I", "show me", "list my", "harvest", "yield", "honey production", "in 2024", "in 2025", "this year", "last year"
   Examples:
   - "How many hives do I have?"
   - "When was my last inspection?"
   - "Which colony has the highest varroa load?"
   - "Show my varroa counts"
   - "Which hive needs treatment?"
   - "What's my average honey harvest?"
   - "List my apiaries"
   - "Which colony had the highest honey yield in 2025?"
   - "How much honey did I harvest this year?"

2. "knowledge" - General beekeeping education/reference questions NOT about their specific data.
   KEY SIGNALS: "how do I", "what is", "why do bees", "best practices", "should I", "how to"
   Examples:
   - "How do I treat varroa mites?"
   - "What are signs of a queenless hive?"
   - "Best practices for winter feeding"
   - "What temperature should I treat at?"

3. "hybrid" - Questions about the user's inspection notes or observations
   Examples: "Find my notes about queen problems", "When did I note aggressive behavior?"

4. "general" - Greetings, off-topic, or unclear queries
   Examples: "Hello", "What can you do?", "Tell me a joke"

IMPORTANT: If the user asks about "which hive/colony" or their specific mite counts, varroa levels, inspections - classify as "sql", NOT "knowledge".

Respond with JSON only: {"intent": "category", "confidence": 0.0-1.0}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
    temperature: 0,
    max_tokens: 100,
    response_format: { type: 'json_object' }
  })

  try {
    const result = JSON.parse(response.choices?.[0]?.message?.content || '{}')
    return {
      intent: result.intent || 'general',
      confidence: result.confidence || 0.5
    }
  } catch (err) {
    console.error('Failed to parse query classification response:', err, response.choices?.[0]?.message?.content)
    return { intent: 'general', confidence: 0.5 }
  }
}

export { getOpenAI as openai }

import OpenAI from 'openai'

// Default request bounds applied to every call via this singleton client.
// SDK defaults are 600s timeout x 2 retries -- a single hung request can
// pin a Fluid Compute instance for ~30 minutes on an OpenAI partial-outage.
// 30s + 1 retry is the right safety net for the short calls (embeddings,
// classification). Long calls (chat completion) override per-call below.
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 1
const CHAT_TIMEOUT_MS = 60_000

// Lazy initialization of OpenAI client (server-side only)
let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    _openai = new OpenAI({
      apiKey,
      timeout: DEFAULT_TIMEOUT_MS,
      maxRetries: DEFAULT_MAX_RETRIES,
    })
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

// Embeddings for many texts, 100 per OpenAI request, in the same order as `texts`. One request
// per chunk, one after another, made large uploads time out (C2-02).
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100)
    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    const ordered = [...(response.data ?? [])].sort((a, b) => a.index - b.index)
    if (ordered.length !== batch.length || ordered.some(d => !d.embedding)) {
      throw new Error('OpenAI embedding response was incomplete')
    }
    embeddings.push(...ordered.map(d => d.embedding))
  }
  return embeddings
}

// Chat completion with specified model
export async function generateChatResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini'
): Promise<string> {
  const response = await getOpenAI().chat.completions.create(
    {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    },
    { timeout: CHAT_TIMEOUT_MS }
  )
  return response.choices?.[0]?.message?.content || ''
}

// A short JSON answer at temperature 0 (the tool router): the same question always routes the
// same way, and JSON mode means no hand-stripped code fences.
export async function generateJsonResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  })
  return response.choices?.[0]?.message?.content || ''
}

const INTENTS = ['sql', 'knowledge', 'hybrid', 'general'] as const

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
    // Only the four known intents; anything else the model writes counts as general.
    return {
      intent: INTENTS.includes(result.intent) ? result.intent : 'general',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5
    }
  } catch (err) {
    console.error('Failed to parse query classification response:', err, response.choices?.[0]?.message?.content)
    return { intent: 'general', confidence: 0.5 }
  }
}

export { getOpenAI as openai }

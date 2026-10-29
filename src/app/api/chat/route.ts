import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'
import { handleChatQuery } from '@/lib/rag'
import { ChatMessage } from '@/types/chat'
import { consumeRateLimits, RATE_LIMITS, RATE_LIMITED_MESSAGE } from '@/lib/rate-limit'
import { createUserSupabase, runWithUserSupabase } from '@/lib/ai/tools/utils'

const MAX_MESSAGE_CHARS = 2000
// The answer uses the last 6 messages (src/lib/rag.ts); more would only be parsed and dropped.
const MAX_HISTORY_MESSAGES = 6
const MAX_HISTORY_CHARS_PER_MESSAGE = 4000

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    // Signed-in caller; is_active is checked in this route's own profile query below.
    const auth = await requireUser(request)
    if ('response' in auth) return auth.response
    const { user, supabaseAdmin, token } = auth

    // Check if user has active subscription (premium feature)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_expires_at, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Soft-deleted / admin-disabled accounts must lose access even if their
    // subscription clock has not yet run out. Mirrors src/lib/auth.ts.
    if (profile.is_active === false) {
      return NextResponse.json(
        { error: 'Account is not active', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      )
    }

    // Check subscription status
    const now = new Date()
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
    const hasActiveSubscription = expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt > now

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Premium subscription required', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    // Parse JSON body in an inner try/catch so a malformed payload returns
    // 400 with a clear log line instead of being swallowed as a generic 500.
    let parsed: unknown
    try {
      parsed = await request.json()
    } catch (err) {
      console.error('chat route: malformed JSON body:', err)
      return NextResponse.json(
        { error: 'Malformed request body' },
        { status: 400 }
      )
    }

    const body = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {}
    const message = body.message
    const conversationHistoryRaw = body.conversationHistory

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Limit message length
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` },
        { status: 400 }
      )
    }

    // Validate conversation history shape at runtime. An `as` cast cannot
    // protect against a client sending e.g. conversationHistory: "string",
    // which would throw at .filter() and bleed into the generic 500 path.
    if (conversationHistoryRaw !== undefined && !Array.isArray(conversationHistoryRaw)) {
      return NextResponse.json(
        { error: 'conversationHistory must be an array' },
        { status: 400 }
      )
    }

    // Convert conversation history to format expected by RAG. Bounds: cap
    // the number of messages and the per-message size so a hostile client
    // cannot bypass the per-message length cap by stuffing history.
    const rawHistory: ChatMessage[] = Array.isArray(conversationHistoryRaw)
      ? (conversationHistoryRaw as ChatMessage[])
      : []
    const history = rawHistory
      .filter(m => m && typeof m === 'object' && typeof m.content === 'string'
        && (m.role === 'user' || m.role === 'assistant'))
      .slice(-MAX_HISTORY_MESSAGES)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.length > MAX_HISTORY_CHARS_PER_MESSAGE
          ? m.content.slice(0, MAX_HISTORY_CHARS_PER_MESSAGE)
          : m.content
      }))

    // Each message costs several paid OpenAI calls: cap per user, per hour and per day.
    if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.chatHourly, RATE_LIMITS.chatDaily]))) {
      return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 })
    }

    // Process the chat query. The AI tools query the database as this user (their own token),
    // so RLS applies to everything Mel looks up.
    const result = await runWithUserSupabase(createUserSupabase(token), () =>
      handleChatQuery(message, user.id, history)
    )

    return NextResponse.json({
      message: result.response,
      intent: result.intent,
      sources: result.sources
    })

  } catch (error) {
    console.error('Chat API error:', error)

    // Check for specific OpenAI errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isOpenAIError = errorMessage.includes('OpenAI') || errorMessage.includes('API')

    return NextResponse.json(
      { error: isOpenAIError ? 'AI service error' : 'Failed to process message' },
      { status: 500 }
    )
  }
}

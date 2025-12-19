import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleChatQuery } from '@/lib/rag'
import { ChatMessage } from '@/types/chat'

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

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

    // Check subscription status
    const now = new Date()
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
    const hasActiveSubscription = expiresAt && expiresAt > now

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Premium subscription required', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { message, conversationHistory } = body as {
      message: string
      conversationHistory?: ChatMessage[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Limit message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    // Convert conversation history to format expected by RAG
    const history = (conversationHistory || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    // Process the chat query
    const result = await handleChatQuery(message, user.id, history)

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
      {
        error: isOpenAIError ? 'AI service error' : 'Failed to process message',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

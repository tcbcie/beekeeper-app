import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/api-auth'
import { consumeRateLimits, RATE_LIMITS, RATE_LIMITED_MESSAGE } from '@/lib/rate-limit'
import { searchNewsArticles } from '@/lib/rag'

export async function GET(request: NextRequest) {
  // Require auth: searchNewsArticles internally calls OpenAI embeddings,
  // which costs money per request. The only caller is the dashboard /about
  // page (already auth-gated at the page level), but the route itself was
  // open to unauthenticated callers -- a cost-amplification vector for
  // anyone who finds the URL.
  const auth = await requireUser(request, { requireActive: true })
  if ('response' in auth) return auth.response
  const { user, supabaseAdmin } = auth

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10)
  const limit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), 50)

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters' },
      { status: 400 }
    )
  }

  if (query.trim().length > 500) {
    return NextResponse.json(
      { error: 'Query must be at most 500 characters' },
      { status: 400 }
    )
  }

  if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.newsSearch]))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 })
  }

  try {
    const results = await searchNewsArticles(query.trim(), limit)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('News search API error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

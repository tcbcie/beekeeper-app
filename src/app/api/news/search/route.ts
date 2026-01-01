import { NextRequest, NextResponse } from 'next/server'
import { searchNewsArticles } from '@/lib/rag'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters' },
      { status: 400 }
    )
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

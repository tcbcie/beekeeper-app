import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/openai'
import * as cheerio from 'cheerio'

// Create admin client with service role key
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper to verify admin access
async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return { userId: user.id }
}

// Extract metadata from URL (Open Graph, Twitter Cards, meta tags)
interface UrlMetadata {
  title: string
  description: string | null
  imageUrl: string | null
  siteName: string | null
  publishedDate: string | null
  author: string | null
  content: string
}

async function extractUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HiveCraic/1.0; +https://hivecraic.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract Open Graph / Twitter / standard meta tags
    const getMetaContent = (selectors: string[]): string | null => {
      for (const selector of selectors) {
        const content = $(selector).attr('content')
        if (content) return content.trim()
      }
      return null
    }

    // Title - priority: og:title > twitter:title > title tag
    const title = getMetaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ]) || $('title').text().trim() || url

    // Description
    const description = getMetaContent([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ])

    // Image
    const imageUrl = getMetaContent([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]'
    ])

    // Site name
    const siteName = getMetaContent([
      'meta[property="og:site_name"]'
    ]) || new URL(url).hostname.replace('www.', '')

    // Published date
    const publishedDate = getMetaContent([
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="pubdate"]',
      'meta[name="publishdate"]',
      'meta[property="og:article:published_time"]'
    ])

    // Author
    const author = getMetaContent([
      'meta[property="article:author"]',
      'meta[name="author"]',
      'meta[property="og:article:author"]'
    ])

    // Extract main content for knowledge base
    $('script, style, nav, header, footer, aside, iframe, noscript, .comments, #comments, .sidebar, .advertisement, .ad').remove()

    let content = ''
    const contentSelectors = ['article', 'main', '.content', '.post', '.article-body', '#content', '.entry-content', '.post-content']

    for (const selector of contentSelectors) {
      const el = $(selector)
      if (el.length > 0) {
        content = el.text()
        break
      }
    }

    // Fallback to body
    if (!content || content.length < 100) {
      content = $('body').text()
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim()

    return {
      title,
      description,
      imageUrl,
      siteName,
      publishedDate,
      author,
      content
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// Split text into chunks for embedding
function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10

  for (let i = 0; i < maxIterations && start < text.length; i++) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > chunkSize * 0.3) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    const trimmedChunk = chunk.trim()
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk)
    }

    const advance = Math.max(chunk.length - overlap, 100)
    start = start + advance

    if (start >= text.length) break
  }

  return chunks.filter(c => c.length > 50)
}

// Ingest article content to knowledge base
async function ingestToKnowledgeBase(
  content: string,
  title: string,
  author: string | null,
  publishedDate: string | null,
  url: string
): Promise<string | null> {
  if (content.length < 200) {
    return null // Not enough content to ingest
  }

  const supabase = getSupabaseAdmin()

  // Create knowledge source
  const { data: source, error: sourceError } = await supabase
    .from('knowledge_sources')
    .insert({
      name: title,
      author: author || null,
      published_date: publishedDate ? publishedDate.split('T')[0] : null,
      source_url: url,
      chunks_count: 0
    })
    .select('id')
    .single()

  if (sourceError || !source) {
    console.error('Error creating knowledge source:', sourceError)
    return null
  }

  // Split and embed content
  const chunks = splitTextIntoChunks(content)
  let successCount = 0

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i])

      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          content: chunks[i],
          metadata: {
            source: title,
            author: author || undefined,
            topic: 'News/Article',
            chunk_index: i,
            total_chunks: chunks.length
          },
          embedding,
          source_id: source.id
        })

      if (!error) successCount++
    } catch (err) {
      console.error(`Error embedding chunk ${i}:`, err)
    }
  }

  // Update chunks count
  await supabase
    .from('knowledge_sources')
    .update({ chunks_count: successCount })
    .eq('id', source.id)

  return source.id
}

// GET - List news articles
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const search = searchParams.get('search') || ''
  const publishedOnly = searchParams.get('published_only') === 'true'

  let query = getSupabaseAdmin()
    .from('news_articles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (publishedOnly) {
    query = query.eq('is_published', true)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}

// POST - Add new article by URL
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { url, autoIngestKB = true } = body as { url: string; autoIngestKB?: boolean }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Check for duplicate
    const { data: existing } = await supabase
      .from('news_articles')
      .select('id, title')
      .eq('url', url)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Article with this URL already exists',
        existing: { id: existing.id, title: existing.title }
      }, { status: 409 })
    }

    // Extract metadata from URL
    const metadata = await extractUrlMetadata(url)

    // Ingest to knowledge base if enabled and content is sufficient
    let kbSourceId: string | null = null
    if (autoIngestKB && metadata.content.length >= 200) {
      kbSourceId = await ingestToKnowledgeBase(
        metadata.content,
        metadata.title,
        metadata.author,
        metadata.publishedDate,
        url
      )
    }

    // Parse published date
    let parsedDate: string | null = null
    if (metadata.publishedDate) {
      try {
        const date = new Date(metadata.publishedDate)
        if (!isNaN(date.getTime())) {
          parsedDate = date.toISOString().split('T')[0]
        }
      } catch {
        // Ignore invalid date
      }
    }

    // Insert article
    const { data: article, error } = await supabase
      .from('news_articles')
      .insert({
        url,
        title: metadata.title,
        description: metadata.description,
        image_url: metadata.imageUrl,
        site_name: metadata.siteName,
        published_date: parsedDate,
        author: metadata.author,
        content: metadata.content.substring(0, 50000), // Limit stored content
        kb_source_id: kbSourceId,
        created_by: (authResult as { userId: string }).userId
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      article,
      kb_ingested: !!kbSourceId
    })

  } catch (error) {
    console.error('News articles POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add article', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Update article
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { id, title, description, image_url, site_name, published_date, author, is_published } = body as {
      id: string
      title?: string
      description?: string | null
      image_url?: string | null
      site_name?: string | null
      published_date?: string | null
      author?: string | null
      is_published?: boolean
    }

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (image_url !== undefined) updates.image_url = image_url
    if (site_name !== undefined) updates.site_name = site_name
    if (published_date !== undefined) updates.published_date = published_date
    if (author !== undefined) updates.author = author
    if (is_published !== undefined) updates.is_published = is_published

    const { data, error } = await getSupabaseAdmin()
      .from('news_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, article: data })

  } catch (error) {
    console.error('News articles PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update article', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove article
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Article ID is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Get article to check for KB link
  const { data: article } = await supabase
    .from('news_articles')
    .select('kb_source_id, title')
    .eq('id', id)
    .single()

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // Delete from knowledge base if linked
  if (article.kb_source_id) {
    await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', article.kb_source_id)
  }

  // Delete article
  const { error } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    deleted: article.title,
    kb_removed: !!article.kb_source_id
  })
}

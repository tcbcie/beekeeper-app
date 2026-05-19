import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/openai'
import * as cheerio from 'cheerio'

// Lazy load pdf-parse to avoid module initialization issues in serverless
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfParse: any = null
function getPdfParse() {
  if (!_pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _pdfParse = require('pdf-parse')
  }
  return _pdfParse
}

// Create admin client with service role key (lazy initialization)
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
    console.error('Auth error:', authError?.message, 'User:', user?.id)
    return NextResponse.json({ error: 'Invalid authentication', details: authError?.message }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError.message, 'User ID:', user.id)
    return NextResponse.json({ error: 'Failed to fetch profile', details: profileError.message }, { status: 500 })
  }

  // Soft-deleted admin must lose access even if their JWT is still valid.
  if (!profile || profile.role !== 'Admin' || profile.is_active === false) {
    console.error('Admin check failed. User:', user.id, 'Email:', user.email, 'Role:', profile?.role, 'Active:', profile?.is_active)
    return NextResponse.json({ error: 'Admin access required', role: profile?.role }, { status: 403 })
  }

  return { userId: user.id }
}

// Split text into chunks for embedding
function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0

  // Safety limit to prevent infinite loops
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10

  for (let i = 0; i < maxIterations && start < text.length; i++) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at a sentence or paragraph boundary
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

    // Move start forward, ensuring we always make progress
    const advance = Math.max(chunk.length - overlap, 100)
    start = start + advance

    // Break if we've reached the end
    if (start >= text.length) break
  }

  return chunks.filter(c => c.length > 50) // Filter out tiny chunks
}

// GET - List knowledge base entries or sources
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'entries' // 'entries' or 'sources'
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // List sources (for source management view)
  if (view === 'sources') {
    const { data, error, count } = await getSupabaseAdmin()
      .from('knowledge_sources')
      .select('id, name, author, published_date, source_url, original_filename, file_path, chunks_count, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, total: count, view: 'sources' })
  }

  // Default: list entries
  const { data, error, count } = await getSupabaseAdmin()
    .from('knowledge_base')
    .select('id, content, metadata, source_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, view: 'entries' })
}

// Helper to extract text from PDF buffer
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await getPdfParse()(buffer)
  return data.text
}

// Helper to extract text from URL
async function extractTextFromUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

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

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove()

    // Get main content - try common selectors first
    let content = ''
    const selectors = ['article', 'main', '.content', '.post', '#content', '.article-body']

    for (const selector of selectors) {
      const el = $(selector)
      if (el.length > 0) {
        content = el.text()
        break
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $('body').text()
    }

    // Clean up whitespace
    return content.replace(/\s+/g, ' ').trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

// Helper to process content and add to knowledge base
async function processAndStoreContent(
  content: string,
  sourceName: string,
  topic: string,
  author?: string,
  publishedYear?: string,
  sourceUrl?: string
): Promise<{ success: boolean; chunks_created: number; message: string; source_id?: string }> {
  const chunks = splitTextIntoChunks(content)

  if (chunks.length === 0) {
    return { success: false, chunks_created: 0, message: 'No valid content chunks to process' }
  }

  // Create source record first
  const publishedDate = publishedYear ? `${publishedYear}-01-01` : null
  const { data: sourceRecord, error: sourceError } = await getSupabaseAdmin()
    .from('knowledge_sources')
    .insert({
      name: sourceName,
      author: author || null,
      published_date: publishedDate,
      source_url: sourceUrl || null,
      chunks_count: 0
    })
    .select('id')
    .single()

  if (sourceError) {
    console.error('Error creating source:', sourceError)
    return { success: false, chunks_created: 0, message: `Failed to create source: ${sourceError.message}` }
  }

  const sourceId = sourceRecord.id

  // Process chunks and link to source
  const results = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const { data, error } = await getSupabaseAdmin()
      .from('knowledge_base')
      .insert({
        content: chunk,
        metadata: {
          source: sourceName,
          author: author || undefined,
          topic: topic || 'General',
          chunk_index: i,
          total_chunks: chunks.length
        },
        embedding,
        source_id: sourceId
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting chunk:', error)
      continue
    }

    results.push(data)
  }

  // Update source with chunks count
  await getSupabaseAdmin()
    .from('knowledge_sources')
    .update({ chunks_count: results.length })
    .eq('id', sourceId)

  return {
    success: true,
    chunks_created: results.length,
    message: `Added ${results.length} chunks to knowledge base`,
    source_id: sourceId
  }
}

// POST - Add new content to knowledge base
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { type = 'text', content, source, author, published_year, topic, pdfData, url, source_url } = body as {
      type?: 'text' | 'pdf' | 'url'
      content?: string
      source?: string
      author?: string
      published_year?: string
      topic?: string
      pdfData?: string // base64 encoded PDF
      url?: string
      source_url?: string
    }

    let textContent = ''
    let contentSource = source || 'Manual entry'

    switch (type) {
      case 'pdf': {
        if (!pdfData || typeof pdfData !== 'string') {
          return NextResponse.json({ error: 'PDF data is required' }, { status: 400 })
        }

        // Reject by encoded length before decoding so a hostile 50MB base64
        // string is not first allocated into memory only to fail the size
        // check below. Base64 inflates payload by ~4/3, so the encoded
        // string for a 5MB PDF is at most ~6.85MB.
        if (pdfData.length > 7 * 1024 * 1024) {
          return NextResponse.json({ error: 'PDF too large (max 5MB)' }, { status: 400 })
        }

        // Decode base64 and extract text
        const buffer = Buffer.from(pdfData, 'base64')

        // Final check on the decoded buffer (defence in depth -- the encoded-
        // length check above is the primary gate).
        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'PDF too large (max 5MB)' }, { status: 400 })
        }

        textContent = await extractTextFromPdf(buffer)
        contentSource = source || 'PDF Upload'
        break
      }

      case 'url': {
        if (!url) {
          return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Validate URL format and protocol
        let parsedUrl: URL
        try {
          parsedUrl = new URL(url)
        } catch {
          return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
        }

        // SSRF protection: only allow HTTPS, block private/internal addresses
        if (parsedUrl.protocol !== 'https:') {
          return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 })
        }
        const hostname = parsedUrl.hostname.toLowerCase()
        const isPrivate =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '0.0.0.0' ||
          hostname.endsWith('.local') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('169.254.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
        if (isPrivate) {
          return NextResponse.json({ error: 'Internal/private URLs are not allowed' }, { status: 400 })
        }

        textContent = await extractTextFromUrl(url)
        contentSource = source || url
        break
      }

      case 'text':
      default: {
        if (!content || typeof content !== 'string') {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }
        textContent = content
        break
      }
    }

    if (textContent.length < 100) {
      return NextResponse.json({ error: 'Extracted content too short (min 100 characters)' }, { status: 400 })
    }

    const result = await processAndStoreContent(textContent, contentSource, topic || 'General', author, published_year, source_url)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Knowledge base POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Update source metadata
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { source_id, name, author, published_year, source_url, original_filename } = body as {
      source_id: string
      name?: string
      author?: string | null
      published_year?: string | null
      source_url?: string | null
      original_filename?: string | null
    }

    if (!source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 })
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updates.name = name
    if (author !== undefined) updates.author = author
    if (published_year !== undefined) {
      updates.published_date = published_year ? `${published_year}-01-01` : null
    }
    if (source_url !== undefined) updates.source_url = source_url
    if (original_filename !== undefined) updates.original_filename = original_filename

    const { error } = await getSupabaseAdmin()
      .from('knowledge_sources')
      .update(updates)
      .eq('id', source_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update metadata in linked chunks if name changed (best-effort)
    if (name) {
      try {
        await getSupabaseAdmin().rpc('update_knowledge_chunks_source', {
          p_source_id: source_id,
          p_source_name: name,
          p_author: author || null
        })
      } catch {
        // RPC may not exist - chunks will have old metadata but still work
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Knowledge base PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update source', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove entry or source from knowledge base
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const sourceId = searchParams.get('source_id')

  // Delete entire source (and all its chunks via CASCADE)
  if (sourceId) {
    // Get source info for response
    const { data: source } = await getSupabaseAdmin()
      .from('knowledge_sources')
      .select('name, chunks_count')
      .eq('id', sourceId)
      .single()

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    const { error } = await getSupabaseAdmin()
      .from('knowledge_sources')
      .delete()
      .eq('id', sourceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: 'source',
      name: source.name,
      chunks_deleted: source.chunks_count
    })
  }

  // Delete individual entry
  if (!id) {
    return NextResponse.json({ error: 'ID or source_id is required' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from('knowledge_base')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: 'entry' })
}

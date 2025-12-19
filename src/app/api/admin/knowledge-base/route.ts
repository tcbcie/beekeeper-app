import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/openai'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
import * as cheerio from 'cheerio'

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

// Helper to verify admin access
async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
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

// GET - List knowledge base entries
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error, count } = await supabaseAdmin
    .from('knowledge_base')
    .select('id, content, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}

// Helper to extract text from PDF buffer
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
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
  source: string,
  topic: string
): Promise<{ success: boolean; chunks_created: number; message: string }> {
  const chunks = splitTextIntoChunks(content)

  if (chunks.length === 0) {
    return { success: false, chunks_created: 0, message: 'No valid content chunks to process' }
  }

  const results = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        content: chunk,
        metadata: {
          source,
          topic: topic || 'General',
          chunk_index: i,
          total_chunks: chunks.length
        },
        embedding
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting chunk:', error)
      continue
    }

    results.push(data)
  }

  return {
    success: true,
    chunks_created: results.length,
    message: `Added ${results.length} chunks to knowledge base`
  }
}

// POST - Add new content to knowledge base
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { type = 'text', content, source, topic, pdfData, url } = body as {
      type?: 'text' | 'pdf' | 'url'
      content?: string
      source?: string
      topic?: string
      pdfData?: string // base64 encoded PDF
      url?: string
    }

    let textContent = ''
    let contentSource = source || 'Manual entry'

    switch (type) {
      case 'pdf': {
        if (!pdfData) {
          return NextResponse.json({ error: 'PDF data is required' }, { status: 400 })
        }

        // Decode base64 and extract text
        const buffer = Buffer.from(pdfData, 'base64')

        // Check file size (5MB limit)
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

        // Validate URL
        try {
          new URL(url)
        } catch {
          return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
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

    const result = await processAndStoreContent(textContent, contentSource, topic || 'General')

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

// DELETE - Remove entry from knowledge base
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('knowledge_base')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

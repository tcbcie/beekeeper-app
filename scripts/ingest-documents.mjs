#!/usr/bin/env node
/**
 * Bulk Document Ingestion Script for Knowledge Base
 *
 * Usage: node scripts/ingest-documents.mjs <directory-path>
 *
 * Features:
 * - Ingests all PDF files from specified directory
 * - Detects duplicates via file hash
 * - Tracks sources in knowledge_sources table
 * - Supports author and publish date via filename convention:
 *   "Book Title - Author Name (2023).pdf"
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPENAI_API_KEY
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

// Dynamically import pdf-parse (CommonJS module)
const pdfParse = (await import('pdf-parse')).default

// Configuration
const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200
const EMBEDDING_MODEL = 'text-embedding-3-small'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Calculate SHA-256 hash of file
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileBuffer).digest('hex')
}

// Parse filename to extract title, author, and year
// Expected format: "Book Title - Author Name (2023).pdf"
function parseFilename(filename) {
  const baseName = path.basename(filename, path.extname(filename))

  // Try to extract year from parentheses at the end
  const yearMatch = baseName.match(/\((\d{4})\)$/)
  const publishedDate = yearMatch ? `${yearMatch[1]}-01-01` : null
  const nameWithoutYear = yearMatch ? baseName.replace(/\s*\(\d{4}\)$/, '') : baseName

  // Try to split by " - " for author
  const parts = nameWithoutYear.split(' - ')
  if (parts.length >= 2) {
    return {
      name: parts[0].trim(),
      author: parts.slice(1).join(' - ').trim(),
      publishedDate
    }
  }

  return {
    name: nameWithoutYear.trim(),
    author: null,
    publishedDate
  }
}

// Split text into chunks
function splitTextIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10

  for (let i = 0; i < maxIterations && start < text.length; i++) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at sentence/paragraph boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > chunkSize * 0.3) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    const trimmedChunk = chunk.trim()
    if (trimmedChunk.length > 50) {
      chunks.push(trimmedChunk)
    }

    const advance = Math.max(chunk.length - overlap, 100)
    start = start + advance

    if (start >= text.length) break
  }

  return chunks
}

// Generate embedding for text
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: 1536
  })
  return response.data[0].embedding
}

// Check if source already exists by hash
async function checkDuplicate(fileHash) {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('id, name')
    .eq('file_hash', fileHash)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error
  }

  return data
}

// Create source record
async function createSource(name, author, publishedDate, filePath, fileHash) {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      name,
      author,
      published_date: publishedDate,
      file_path: filePath,
      file_hash: fileHash,
      chunks_count: 0
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// Update source chunks count
async function updateSourceChunksCount(sourceId, count) {
  const { error } = await supabase
    .from('knowledge_sources')
    .update({ chunks_count: count, updated_at: new Date().toISOString() })
    .eq('id', sourceId)

  if (error) throw error
}

// Process a single PDF file
async function processFile(filePath) {
  const filename = path.basename(filePath)
  console.log(`\nProcessing: ${filename}`)

  // Calculate hash for duplicate detection
  const fileHash = calculateFileHash(filePath)

  // Check for duplicate
  const existing = await checkDuplicate(fileHash)
  if (existing) {
    console.log(`  SKIPPED: Already ingested as "${existing.name}"`)
    return { status: 'skipped', reason: 'duplicate' }
  }

  // Parse filename for metadata
  const { name, author, publishedDate } = parseFilename(filename)
  console.log(`  Title: ${name}`)
  if (author) console.log(`  Author: ${author}`)
  if (publishedDate) console.log(`  Published: ${publishedDate}`)

  // Read and parse PDF
  const buffer = fs.readFileSync(filePath)
  let pdfData
  try {
    pdfData = await pdfParse(buffer)
  } catch (err) {
    console.log(`  ERROR: Failed to parse PDF - ${err.message}`)
    return { status: 'error', reason: err.message }
  }

  const text = pdfData.text
  if (text.length < 100) {
    console.log(`  ERROR: Extracted text too short (${text.length} chars)`)
    return { status: 'error', reason: 'text too short' }
  }

  console.log(`  Extracted ${text.length} characters`)

  // Create source record
  const sourceId = await createSource(name, author, publishedDate, filePath, fileHash)
  console.log(`  Created source: ${sourceId}`)

  // Split into chunks
  const chunks = splitTextIntoChunks(text)
  console.log(`  Split into ${chunks.length} chunks`)

  // Process each chunk
  let successCount = 0
  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk)

      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          content: chunk,
          metadata: {
            source: name,
            author: author || undefined,
            topic: 'Beekeeping',
            chunk_index: i,
            total_chunks: chunks.length
          },
          embedding,
          source_id: sourceId
        })

      if (error) {
        console.log(`  Warning: Failed to insert chunk ${i + 1}: ${error.message}`)
      } else {
        successCount++
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`  Progress: ${i + 1}/${chunks.length}\r`)
      }
    } catch (err) {
      console.log(`  Warning: Error processing chunk ${i + 1}: ${err.message}`)
    }
  }

  // Update chunks count
  await updateSourceChunksCount(sourceId, successCount)
  console.log(`  Completed: ${successCount}/${chunks.length} chunks stored`)

  return { status: 'success', chunks: successCount }
}

// List all sources in the knowledge base
async function listSources() {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sources:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('No sources found in knowledge base.')
    return
  }

  console.log('\n=== Knowledge Base Sources ===\n')
  console.log('ID | Name | Author | Published | Chunks | Added')
  console.log('-'.repeat(80))

  for (const source of data) {
    const published = source.published_date ? source.published_date.split('T')[0] : 'N/A'
    const added = new Date(source.created_at).toLocaleDateString()
    console.log(`${source.id.slice(0, 8)}... | ${source.name.slice(0, 30)} | ${(source.author || 'N/A').slice(0, 15)} | ${published} | ${source.chunks_count} | ${added}`)
  }

  console.log(`\nTotal: ${data.length} sources`)
}

// Delete a source and all its chunks
async function deleteSource(sourceId) {
  // Get source info first
  const { data: source, error: fetchError } = await supabase
    .from('knowledge_sources')
    .select('name, chunks_count')
    .eq('id', sourceId)
    .single()

  if (fetchError) {
    console.error(`Source not found: ${sourceId}`)
    return false
  }

  console.log(`Deleting "${source.name}" (${source.chunks_count} chunks)...`)

  // Delete source (chunks will cascade due to ON DELETE CASCADE)
  const { error: deleteError } = await supabase
    .from('knowledge_sources')
    .delete()
    .eq('id', sourceId)

  if (deleteError) {
    console.error('Delete failed:', deleteError.message)
    return false
  }

  console.log('Deleted successfully.')
  return true
}

// Main function
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage: node scripts/ingest-documents.mjs <command> [options]

Commands:
  <directory>     Ingest all PDFs from directory
  --list          List all ingested sources
  --delete <id>   Delete a source and all its chunks

Examples:
  node scripts/ingest-documents.mjs ./books
  node scripts/ingest-documents.mjs --list
  node scripts/ingest-documents.mjs --delete abc123...

Filename convention for metadata:
  "Book Title - Author Name (2023).pdf"
    `)
    process.exit(1)
  }

  // Handle --list command
  if (args[0] === '--list') {
    await listSources()
    process.exit(0)
  }

  // Handle --delete command
  if (args[0] === '--delete') {
    if (!args[1]) {
      console.error('Please provide source ID to delete')
      process.exit(1)
    }
    await deleteSource(args[1])
    process.exit(0)
  }

  // Directory ingestion
  const directoryPath = args[0]

  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`)
    process.exit(1)
  }

  const stat = fs.statSync(directoryPath)
  if (!stat.isDirectory()) {
    console.error(`Not a directory: ${directoryPath}`)
    process.exit(1)
  }

  // Find all PDF files
  const files = fs.readdirSync(directoryPath)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(directoryPath, f))

  if (files.length === 0) {
    console.log('No PDF files found in directory.')
    process.exit(0)
  }

  console.log(`Found ${files.length} PDF files to process`)
  console.log('='.repeat(50))

  const results = {
    success: 0,
    skipped: 0,
    error: 0
  }

  for (const file of files) {
    try {
      const result = await processFile(file)
      results[result.status]++
    } catch (err) {
      console.error(`  FATAL ERROR: ${err.message}`)
      results.error++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Ingestion Complete!')
  console.log(`  Success: ${results.success}`)
  console.log(`  Skipped (duplicates): ${results.skipped}`)
  console.log(`  Errors: ${results.error}`)
}

main().catch(console.error)

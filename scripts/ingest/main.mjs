#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

import { loadConfig } from './config.mjs'
import * as fileProcessing from './file-processing.mjs'
import * as textExtraction from './text-extraction.mjs'
import * as translation from './translation.mjs'
import * as database from './database.mjs'
import * as utils from './utils.mjs'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Load configuration
const CONFIG = loadConfig()

async function processFile(filePath, supabase, services, options = {}) {
  const filename = path.basename(filePath)
  console.log(`\nProcessing: ${filename}`)

  // Calculate hash for duplicate detection
  const fileHash = fileProcessing.calculateFileHash(filePath)

  // Check for duplicate
  const existing = await database.checkDuplicate(supabase, fileHash)
  if (existing) {
    if (!options.force) {
      console.log(`  SKIPPED: Already ingested as "${existing.name}"`) 
      return { status: 'skipped', reason: 'duplicate' }
    } else {
      // Force mode: delete existing source first
      console.log(`  Force mode: Deleting existing source "${existing.name}"...`) 
      await database.deleteSource(supabase, existing.id)
      console.log(`  Deleted existing source, re-ingesting...`) 
    }
  }

  // Parse filename for metadata
  const { name, author, publishedDate } = utils.parseFilename(filename)
  console.log(`  Title: ${name}`)
  if (author) console.log(`  Author: ${author}`)
  if (publishedDate) console.log(`  Published: ${publishedDate}`)

  // Read PDF
  const buffer = fileProcessing.readFileBuffer(filePath)

  let text = ''
  let usedOCR = false
  let usedGemini = false
  let processedBy = 'pdf-parse'
  const { openai, geminiModel } = services

  const tryGemini = async () => {
      try {
          text = await textExtraction.extractWithGeminiBatched(buffer, geminiModel, CONFIG.batchSize)
          usedGemini = true
          processedBy = 'gemini-2.0-flash'
          return true
      } catch (err) {
          console.log(`  Gemini OCR failed: ${err.message}`) 
          return false
      }
  }

  const tryOpenAIOCR = async () => {
      try {
        text = await textExtraction.extractTextWithOCR(buffer, openai)
        usedOCR = true
        processedBy = 'openai-vision'
        return true
      } catch (err) {
          console.log(`  OpenAI OCR failed: ${err.message}`) 
          return false
      }
  }

  if (options.forceGemini && geminiModel) {
      console.log('  Forced Gemini mode enabled') 
      if (!(await tryGemini())) {
          console.log('  Falling back to OpenAI Vision OCR...') 
          await tryOpenAIOCR()
      }
  } else if (options.forceOCR) {
      console.log('  Forced OCR mode enabled') 
      // Respect preference from config if both available, otherwise default logic
      if (CONFIG.ocrProviderPreference === 'gemini' && geminiModel) {
          if (!(await tryGemini())) await tryOpenAIOCR()
      } else {
          await tryOpenAIOCR()
      }
  } else {
      // Standard mode
      try {
          text = await textExtraction.extractTextStandard(buffer)
          
          if (text.length < CONFIG.minTextLength) {
               console.log(`  Standard extraction got ${text.length} chars (below threshold ${CONFIG.minTextLength})`) 
               console.log('  Falling back to OCR...') 
               if (geminiModel && CONFIG.ocrProviderPreference === 'gemini') {
                   if (!(await tryGemini())) await tryOpenAIOCR()
               } else {
                   await tryOpenAIOCR()
               }
          } else {
              console.log(`  Extracted ${text.length} characters (standard)`) 
          }
      } catch (err) {
          console.log(`  Standard extraction failed: ${err.message}`) 
          console.log('  Falling back to OCR...') 
           if (geminiModel && CONFIG.ocrProviderPreference === 'gemini') {
               if (!(await tryGemini())) await tryOpenAIOCR()
           } else {
               await tryOpenAIOCR()
           }
      }
  }

  if (text.length < CONFIG.minTextLength) {
    console.log(`  ERROR: Extracted text too short (${text.length} chars)`) 
    return { status: 'error', reason: 'text too short' }
  }

  if (usedGemini) console.log(`  Gemini extracted ${text.length} characters`) 
  else if (usedOCR) console.log(`  OCR extracted ${text.length} characters`) 


  // Language Detection & Translation
  console.log('  Detecting language...') 
  const detectedLanguage = await translation.detectLanguage(text, openai)
  console.log(`  Detected language: ${detectedLanguage}`) 

  let wasTranslated = false
  if (detectedLanguage !== 'en') {
      console.log(`  Document is in ${detectedLanguage}, translation required...`) 
      
      if (geminiModel && CONFIG.translationProviderPreference === 'gemini') {
          try {
              text = await translation.translateFullText(text, detectedLanguage, geminiModel, CONFIG.charBatchSize)
              wasTranslated = true
              processedBy += '+gemini-translate'
          } catch (err) {
              console.log(`  Gemini translation failed: ${err.message}, falling back to chunk translation...`) 
          }
      }

      if (!wasTranslated) {
          let chunks = utils.splitTextIntoChunks(text, CONFIG.chunkSize, CONFIG.chunkOverlap)
          console.log(`  Split into ${chunks.length} chunks for translation`) 
          chunks = await translation.translateChunks(chunks, detectedLanguage, openai)
          wasTranslated = true
          processedBy += '+openai-translate'
          text = chunks.join('\n\n')
      }
      console.log(`  Translation complete`) 
  } else {
      console.log(`  Document is in English, no translation needed`) 
  }

  // Chunking and Embedding
  let chunks = utils.splitTextIntoChunks(text, CONFIG.chunkSize, CONFIG.chunkOverlap)
  console.log(`  Split into ${chunks.length} chunks`) 

  const sourceId = await database.createSource(supabase, name, author, publishedDate, filePath, fileHash, filename)
  console.log(`  Created source: ${sourceId}`) 

  let successCount = 0
  console.log(`  Generating embeddings for ${chunks.length} chunks...`)
  for (let i = 0; i < chunks.length; i++) {
      try {
          const chunk = chunks[i]
          if (i === 0) process.stdout.write(`  Embedding chunk 1/${chunks.length}...`)

          // Small delay between requests to avoid rate limits
          if (i > 0) await new Promise(r => setTimeout(r, 200))

          const embedding = await database.generateEmbedding(chunk, openai, CONFIG.embeddingModel)

          const error = await database.insertChunk(supabase, chunk, embedding, {
            source: name,
            author: author || undefined,
            topic: 'Beekeeping',
            chunk_index: i,
            total_chunks: chunks.length,
            original_language: detectedLanguage,
            was_translated: wasTranslated,
            used_ocr: usedOCR,
            used_gemini: usedGemini,
            processed_by: processedBy
          }, sourceId)

          if (error) {
              console.log(`\n  Warning: Failed to insert chunk ${i + 1}: ${error.message}`)
          } else {
              successCount++
          }

          process.stdout.write(`\r  Embedding progress: ${i + 1}/${chunks.length}`)

      } catch (err) {
           console.log(`\n  Warning: Error processing chunk ${i + 1}: ${err.message}`)
      }
  }
  console.log() // newline after progress

  await database.updateSourceChunksCount(supabase, sourceId, successCount, { processed_by: processedBy, was_translated: wasTranslated, original_language: detectedLanguage })
  console.log(`  Completed: ${successCount}/${chunks.length} chunks stored`) 
  
  return { status: 'success', chunks: successCount, usedOCR, usedGemini, wasTranslated, language: detectedLanguage, processedBy }
}

async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        // ... (Help text similar to original, slightly updated) 
         console.log(`
Usage: node scripts/ingest-documents.mjs <command> [options] 

Commands:
  <directory>     Ingest all PDFs from directory
  --list          List all ingested sources
  --delete <id>   Delete a source and all its chunks

Options:
  --force         Re-ingest even if duplicate detected
  --ocr           Force OCR for all files (skip pdf-parse)
  --gemini        Force Gemini 2.0 Flash for all files (OCR + translation)

Config:
  Loaded from scripts/ingest/ingestion.config.json
    `)
        process.exit(1)
    }

    const supabase = database.initializeDatabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Services init
    const services = await textExtraction.initializeExtractionServices(process.env.OPENAI_API_KEY, process.env.GOOGLE_API_KEY)

    if (args[0] === '--list') {
        const sources = await database.listSources(supabase)
        if (sources && sources.length > 0) {
             console.log('\n=== Knowledge Base Sources ===\n') 
             console.log('ID | Name | Author | Published | Chunks | Added') 
             console.log('-'.repeat(80))
             sources.forEach(source => {
                const published = source.published_date ? source.published_date.split('T')[0] : 'N/A'
                const added = new Date(source.created_at).toLocaleDateString()
                console.log(`${source.id.slice(0, 8)}... | ${source.name.slice(0, 30)} | ${(source.author || 'N/A').slice(0, 15)} | ${published} | ${source.chunks_count} | ${added}`)
             })
             console.log(`\nTotal: ${sources.length} sources`) 
        } else {
             console.log('No sources found.') 
        }
        process.exit(0)
    }

    if (args[0] === '--delete') {
        if (!args[1]) {
            console.error('Please provide source ID to delete') 
            process.exit(1)
        }
        await database.deleteSource(supabase, args[1])
        process.exit(0)
    }

    const directoryPath = args[0]
    const options = {
        force: args.includes('--force'),
        forceOCR: args.includes('--ocr'),
        forceGemini: args.includes('--gemini')
    }

    try {
        const files = fileProcessing.getPdfFiles(directoryPath)
        
        if (files.length === 0) {
            console.log('No PDF files found in directory.') 
            process.exit(0)
        }

        console.log(`Found ${files.length} PDF files to process`) 
        
        const results = {
            success: 0,
            skipped: 0,
            error: 0,
            ocrUsed: 0,
            geminiUsed: 0,
            translated: 0
        }

        for (const file of files) {
            try {
                const result = await processFile(file, supabase, services, options)
                results[result.status]++
                if (result.usedOCR) results.ocrUsed++
                if (result.usedGemini) results.geminiUsed++
                if (result.wasTranslated) results.translated++
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
        console.log(`  Used Gemini: ${results.geminiUsed}`) 
        console.log(`  Used OpenAI OCR: ${results.ocrUsed}`) 
        console.log(`  Translated: ${results.translated}`) 

    } catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}

main().catch(console.error)

import { createClient } from '@supabase/supabase-js'

export function initializeDatabase(supabaseUrl, supabaseKey) {
  return createClient(supabaseUrl, supabaseKey)
}

// Generate embedding for text
export async function generateEmbedding(text, openai, model = 'text-embedding-3-small') {
  const response = await openai.embeddings.create({
    model: model,
    input: text,
    dimensions: 1536
  })
  return response.data[0].embedding
}

// Check if source already exists by hash
export async function checkDuplicate(supabase, fileHash) {
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
export async function createSource(supabase, name, author, publishedDate, filePath, fileHash, originalFilename, metadata = {}) {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      name,
      author,
      published_date: publishedDate,
      file_path: filePath,
      file_hash: fileHash,
      original_filename: originalFilename,
      chunks_count: 0,
      ...metadata
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// Update source chunks count
export async function updateSourceChunksCount(supabase, sourceId, count, metadata = {}) {
  const { error } = await supabase
    .from('knowledge_sources')
    .update({
      chunks_count: count,
      updated_at: new Date().toISOString(),
      ...metadata
    })
    .eq('id', sourceId)

  if (error) throw error
}

// Insert chunk
export async function insertChunk(supabase, chunk, embedding, metadata, sourceId) {
    const { error } = await supabase
        .from('knowledge_base')
        .insert({
            content: chunk,
            metadata: {
                ...metadata
            },
            embedding,
            source_id: sourceId
        })
    return error
}

// List all sources in the knowledge base
export async function listSources(supabase) {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sources:', error.message)
    return null
  }
  return data
}

// Delete a source and all its chunks
export async function deleteSource(supabase, sourceId) {
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

import path from 'path'

// Parse filename to extract title, author, and year
// Expected format: "Book Title - Author Name (2023).pdf"
export function parseFilename(filename) {
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
export function splitTextIntoChunks(text, chunkSize, overlap) {
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

// Sanitize text to remove PostgreSQL-incompatible characters
export function sanitizeText(text) {
  if (!text) return ''
  return text
    .replace(/\x00/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Control chars
    .replace(/\\u0000/g, '') // Literal null escape
    .trim()
}

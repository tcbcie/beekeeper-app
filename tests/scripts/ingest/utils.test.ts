import { describe, it, expect } from 'vitest'
import { parseFilename, splitTextIntoChunks } from '../../../scripts/ingest/utils.mjs'

describe('Ingest Utils', () => {
  describe('parseFilename', () => {
    it('should parse standard filename with author and year', () => {
      const result = parseFilename('Beekeeping Basics - John Doe (2023).pdf')
      expect(result).toEqual({
        name: 'Beekeeping Basics',
        author: 'John Doe',
        publishedDate: '2023-01-01'
      })
    })

    it('should parse filename without year', () => {
      const result = parseFilename('Advanced Hives - Jane Smith.pdf')
      expect(result).toEqual({
        name: 'Advanced Hives',
        author: 'Jane Smith',
        publishedDate: null
      })
    })

    it('should parse filename without author', () => {
      const result = parseFilename('Guide to Bees.pdf')
      expect(result).toEqual({
        name: 'Guide to Bees',
        author: null,
        publishedDate: null
      })
    })

    it('should parse filename with year but no author', () => {
      const result = parseFilename('Yearly Report (2024).pdf')
      expect(result).toEqual({
        name: 'Yearly Report',
        author: null,
        publishedDate: '2024-01-01'
      })
    })
  })

  describe('splitTextIntoChunks', () => {
    it('should split text into chunks respecting size', () => {
      const text = 'a'.repeat(2500)
      const chunks = splitTextIntoChunks(text, 1000, 100)
      expect(chunks.length).toBe(3) // 1000, 1000, 500 (+overlaps roughly)
      expect(chunks[0].length).toBeLessThanOrEqual(1000)
    })

    it('should respect overlap', () => {
      // Production sizes (scripts/ingest/config.mjs): 1000 characters with 200 of overlap.
      const sentence = 'The colony was inspected and the queen was seen laying well. '
      const text = sentence.repeat(50) // about 3,000 characters
      const chunks = splitTextIntoChunks(text, 1000, 200)

      expect(chunks.length).toBeGreaterThan(1)
      // Each chunk breaks at a sentence end, and the next one starts inside the overlap,
      // so the end of one chunk reappears at the start of the next.
      expect(chunks[0].endsWith('.')).toBe(true)
      expect(chunks[1]).toContain(chunks[0].slice(-100))
    })

    it('should not add a duplicate tail chunk at the end of the text', () => {
      // Numbered sentences, so a repeated chunk can only come from the chunker itself.
      const text = Array.from({ length: 50 }, (_, i) => `Inspection ${i + 1} found the queen laying well. `).join('')
      const chunks = splitTextIntoChunks(text, 1000, 200)
      const last = chunks[chunks.length - 1]
      const previous = chunks[chunks.length - 2]
      expect(previous.endsWith(last)).toBe(false)
    })

    it('should handle text smaller than chunk size', () => {
      const text = 'Small text.'
      const chunks = splitTextIntoChunks(text, 1000, 100)
      expect(chunks).toHaveLength(0) // Logic says > 50 chars to push
    })

    it('should handle text just above min threshold', () => {
        const text = 'a'.repeat(60)
        const chunks = splitTextIntoChunks(text, 1000, 100)
        expect(chunks).toHaveLength(1)
    })
  })
})

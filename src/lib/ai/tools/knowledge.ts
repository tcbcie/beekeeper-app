import { z } from 'zod'
import { Tool } from './index'
import { searchKnowledgeBase } from '../../rag'

// Search the knowledge base for beekeeping literature
export const searchBeekeepingKnowledge: Tool = {
  name: 'searchBeekeepingKnowledge',
  description: 'Search beekeeping literature and guides for best practices, treatment methods, swarm signs, seasonal management, and general beekeeping knowledge',
  parameters: z.object({
    query: z.string().describe('Search query for beekeeping knowledge')
  }),
  execute: async (rawArgs: unknown) => {
    const args = rawArgs as { query: string }

    const results = await searchKnowledgeBase(args.query, 5)

    if (results.length === 0) {
      return 'No relevant information found in the knowledge base.'
    }

    // Format results with source attribution
    const formattedResults = results.map((r, i) => {
      const meta = r.metadata as { source?: string; loc?: { pageNumber?: number } }
      const sourceName = meta?.source || 'Knowledge Base'
      const pageNum = meta?.loc?.pageNumber
      const sourceRef = pageNum ? `${sourceName}, page ${pageNum}` : sourceName

      return {
        sourceNumber: i + 1,
        source: sourceRef,
        content: r.content,
        relevance: `${(r.similarity * 100).toFixed(0)}%`
      }
    })

    return {
      query: args.query,
      resultsCount: results.length,
      results: formattedResults
    }
  }
}

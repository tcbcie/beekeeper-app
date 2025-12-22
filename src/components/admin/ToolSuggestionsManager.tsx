'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Loader2, Lightbulb, Code, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface ToolSuggestion {
  id: string
  query: string
  generated_sql: string | null
  had_results: boolean
  created_at: string
}

export default function ToolSuggestionsManager() {
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const toast = useToast()

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('tool_suggestions')
        .select('id, query, generated_sql, had_results, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setSuggestions(data || [])
    } catch (error) {
      console.error('Error fetching tool suggestions:', error)
      toast.error('Failed to load tool suggestions')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const { error } = await supabase
        .from('tool_suggestions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuggestions(prev => prev.filter(s => s.id !== id))
      toast.success('Suggestion deleted')
    } catch (error) {
      console.error('Error deleting suggestion:', error)
      toast.error('Failed to delete suggestion')
    } finally {
      setDeleting(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all tool suggestions? This cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('tool_suggestions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

      if (error) throw error

      setSuggestions([])
      toast.success('All suggestions cleared')
    } catch (error) {
      console.error('Error clearing suggestions:', error)
      toast.error('Failed to clear suggestions')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">AI Tool Suggestions</h3>
          <span className="text-sm text-muted-foreground">({suggestions.length})</span>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Queries that fell back to SQL generation because no dedicated tool exists.
        Use this to identify what tools should be built next.
      </p>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tool suggestions yet</p>
          <p className="text-sm">Queries without matching tools will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {suggestion.had_results ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(suggestion.created_at)}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{suggestion.query}</p>
                </div>
                <button
                  onClick={() => handleDelete(suggestion.id)}
                  disabled={deleting === suggestion.id}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  title="Delete"
                >
                  {deleting === suggestion.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {suggestion.generated_sql && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Code className="w-3 h-3" />
                    View generated SQL
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    {suggestion.generated_sql}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

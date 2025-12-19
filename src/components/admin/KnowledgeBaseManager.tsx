'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, BookOpen, Loader2, FileText, Upload, Link, FileType } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

type InputMode = 'text' | 'pdf' | 'url'

interface KnowledgeEntry {
  id: string
  content: string
  metadata: {
    source?: string
    topic?: string
    chunk_index?: number
    total_chunks?: number
  }
  created_at: string
}

export default function KnowledgeBaseManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [newContent, setNewContent] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/knowledge-base?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (response.ok) {
        setEntries(data.data || [])
        setTotal(data.total || 0)
      } else {
        toast.error(data.error || 'Failed to load knowledge base')
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error)
      toast.error('Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAdd = async () => {
    // Validate based on input mode
    if (inputMode === 'text' && !newContent.trim()) {
      toast.error('Content is required')
      return
    }
    if (inputMode === 'text' && newContent.length < 100) {
      toast.error('Content must be at least 100 characters')
      return
    }
    if (inputMode === 'pdf' && !selectedFile) {
      toast.error('Please select a PDF file')
      return
    }
    if (inputMode === 'url' && !newUrl.trim()) {
      toast.error('URL is required')
      return
    }

    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const requestBody: Record<string, unknown> = {
        type: inputMode,
        source: newSource || undefined,
        topic: newTopic || undefined
      }

      if (inputMode === 'text') {
        requestBody.content = newContent
      } else if (inputMode === 'pdf' && selectedFile) {
        // Convert file to base64
        const buffer = await selectedFile.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        requestBody.pdfData = base64
        if (!newSource) {
          requestBody.source = selectedFile.name
        }
      } else if (inputMode === 'url') {
        requestBody.url = newUrl
      }

      const response = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message || 'Content added successfully')
        setNewContent('')
        setNewSource('')
        setNewTopic('')
        setNewUrl('')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setShowAddForm(false)
        fetchEntries()
      } else {
        toast.error(data.error || 'Failed to add content')
      }
    } catch (error) {
      console.error('Error adding content:', error)
      toast.error('Failed to add content')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/admin/knowledge-base?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        toast.success('Entry deleted')
        fetchEntries()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-forest-600" />
        <span className="ml-2 text-text-secondary">Loading knowledge base...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen size={20} />
            AI Knowledge Base
          </h3>
          <p className="text-sm text-text-tertiary mt-1">
            {total} entries stored for AI chat responses
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Add Content
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-surface-secondary dark:bg-slate-800 rounded-lg p-4 space-y-4 border border-border">
          <h4 className="font-medium text-foreground">Add Beekeeping Knowledge</h4>

          {/* Input Mode Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                inputMode === 'text'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface hover:bg-surface-secondary text-text-secondary'
              }`}
            >
              <FileType size={16} />
              Text
            </button>
            <button
              onClick={() => setInputMode('pdf')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                inputMode === 'pdf'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface hover:bg-surface-secondary text-text-secondary'
              }`}
            >
              <Upload size={16} />
              PDF Upload
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                inputMode === 'url'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface hover:bg-surface-secondary text-text-secondary'
              }`}
            >
              <Link size={16} />
              URL
            </button>
          </div>

          <p className="text-sm text-text-tertiary">
            {inputMode === 'text' && 'Paste text from beekeeping books, guides, or articles. Long text will be automatically split into chunks.'}
            {inputMode === 'pdf' && 'Upload a PDF file (max 5MB). Text will be extracted and split into chunks automatically.'}
            {inputMode === 'url' && 'Enter a URL to a beekeeping article or guide. Content will be extracted and processed.'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Source (optional)
              </label>
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder={inputMode === 'pdf' ? 'Uses filename if empty' : inputMode === 'url' ? 'Uses URL if empty' : 'e.g., The Beekeeper\'s Handbook'}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Topic (optional)
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., Varroa Treatment"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
          </div>

          {/* Text Input */}
          {inputMode === 'text' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Content *
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste beekeeping text here (min 100 characters)..."
                rows={8}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground resize-y"
              />
              <p className="text-xs text-text-muted mt-1">
                {newContent.length} characters
              </p>
            </div>
          )}

          {/* PDF Input */}
          {inputMode === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                PDF File *
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-forest-600 file:text-white file:text-sm"
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-text-muted mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                URL *
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/beekeeping-article"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || (inputMode === 'text' && newContent.length < 100) || (inputMode === 'pdf' && !selectedFile) || (inputMode === 'url' && !newUrl.trim())}
              className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 flex items-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add to Knowledge Base
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No knowledge entries yet</p>
          <p className="text-sm">Add beekeeping content to improve AI responses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-surface border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {entry.metadata?.source && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                        {entry.metadata.source}
                      </span>
                    )}
                    {entry.metadata?.topic && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        {entry.metadata.topic}
                      </span>
                    )}
                    {entry.metadata?.chunk_index !== undefined && (
                      <span className="text-xs text-text-muted">
                        Chunk {entry.metadata.chunk_index + 1}/{entry.metadata.total_chunks}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-3">
                    {entry.content}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Added {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

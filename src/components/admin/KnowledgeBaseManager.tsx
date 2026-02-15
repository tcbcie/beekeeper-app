'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, BookOpen, Loader2, Upload, Link, FileType, Pencil, X, Check, FileText, ExternalLink, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

type InputMode = 'text' | 'pdf' | 'url'
type SortField = 'name' | 'author' | 'year' | 'chunks' | 'added' | 'updated'
type SortDirection = 'asc' | 'desc'

interface KnowledgeSource {
  id: string
  name: string
  author: string | null
  published_date: string | null
  source_url: string | null
  original_filename: string | null
  file_path: string | null
  chunks_count: number
  created_at: string
  updated_at: string
}

type SourceTypeFilter = 'all' | 'documents' | 'news'
type MissingFilter = 'all' | 'missing_author' | 'missing_year' | 'missing_url' | 'any_missing'

export default function KnowledgeBaseManager() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('pdf')
  const [newContent, setNewContent] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newYear, setNewYear] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editOriginalFilename, setEditOriginalFilename] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<SourceTypeFilter>('all')
  const [missingFilter, setMissingFilter] = useState<MissingFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const fileInputRef = useRef<HTMLInputElement>(null)
  const risInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Parse RIS citation file and extract metadata
  // RIS format: TAG  - value (tag + spaces + hyphen + space + value)
  const parseRisFile = (content: string): { title?: string; author?: string; year?: string } => {
    // Handle both Windows (CRLF) and Unix (LF) line endings
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    const authors: string[] = []
    let title = ''
    let year = ''

    for (const line of lines) {
      // RIS format: "TY  - JOUR" or "T1  - Title" (2 chars + spaces + hyphen + space + value)
      const match = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/)
      if (!match) continue

      const [, tag, value] = match
      const trimmedValue = value.trim()

      switch (tag) {
        case 'TI': // Title
        case 'T1': // Primary Title
          if (!title) title = trimmedValue
          break
        case 'AU': // Author
        case 'A1': // Primary Author
          if (trimmedValue) authors.push(trimmedValue)
          break
        case 'PY': // Publication Year
        case 'Y1': // Primary Date
        case 'DA': // Date
          if (!year && trimmedValue) {
            // Extract just the year (first 4 digits)
            const yearMatch = trimmedValue.match(/(\d{4})/)
            if (yearMatch) year = yearMatch[1]
          }
          break
      }
    }

    return {
      title: title || undefined,
      author: authors.length > 0 ? authors.join(', ') : undefined,
      year: year || undefined
    }
  }

  const handleRisImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingId) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      const parsed = parseRisFile(content)

      if (!parsed.title && !parsed.author && !parsed.year) {
        toast.error('No citation data found in RIS file')
        return
      }

      // Update local state for UI
      const newName = parsed.title || editName
      const newAuthor = parsed.author || editAuthor
      const newYear = parsed.year || editYear

      setEditName(newName)
      setEditAuthor(newAuthor)
      setEditYear(newYear)

      // Auto-save to database
      setSaving(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          toast.error('Not authenticated')
          return
        }

        const response = await fetch('/api/admin/knowledge-base', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source_id: editingId,
            name: newName.trim(),
            author: newAuthor.trim() || null,
            published_year: newYear.trim() || null,
            source_url: editSourceUrl.trim() || null,
            original_filename: editOriginalFilename.trim() || null
          })
        })

        if (response.ok) {
          toast.success('Citation imported and saved')
          setEditingId(null)
          fetchSources()
        } else {
          const data = await response.json()
          toast.error(data.error || 'Failed to save citation')
        }
      } catch (error) {
        console.error('Error saving citation:', error)
        toast.error('Failed to save citation')
      } finally {
        setSaving(false)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read RIS file')
    }
    reader.readAsText(file)

    // Reset input so same file can be selected again
    if (risInputRef.current) risInputRef.current.value = ''
  }

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/knowledge-base?view=sources&limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (response.ok) {
        setSources(data.data || [])
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
    fetchSources()
  }, [fetchSources])

  const handleAdd = async () => {
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
        author: newAuthor || undefined,
        published_year: newYear || undefined,
        topic: newTopic || undefined,
        source_url: newSourceUrl || undefined
      }

      if (inputMode === 'text') {
        requestBody.content = newContent
      } else if (inputMode === 'pdf' && selectedFile) {
        const buffer = await selectedFile.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        requestBody.pdfData = base64
        if (!newSource) {
          requestBody.source = selectedFile.name.replace(/\.pdf$/i, '')
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
        setNewAuthor('')
        setNewYear('')
        setNewTopic('')
        setNewUrl('')
        setNewSourceUrl('')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setShowAddForm(false)
        fetchSources()
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

  const handleDeleteSource = async (id: string, name: string, chunksCount: number) => {
    if (!confirm(`Delete "${name}" and all ${chunksCount} chunks? This cannot be undone.`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/admin/knowledge-base?source_id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        toast.success(`Deleted "${name}" and ${chunksCount} chunks`)
        fetchSources()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete')
    }
  }

  const startEditing = (source: KnowledgeSource) => {
    setEditingId(source.id)
    setEditName(source.name)
    setEditAuthor(source.author || '')
    setEditYear(source.published_date ? source.published_date.split('-')[0] : '')
    setEditSourceUrl(source.source_url || '')
    setEditOriginalFilename(source.original_filename || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditAuthor('')
    setEditYear('')
    setEditSourceUrl('')
    setEditOriginalFilename('')
  }

  const saveEditing = async () => {
    if (!editingId || !editName.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/knowledge-base', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_id: editingId,
          name: editName.trim(),
          author: editAuthor.trim() || null,
          published_year: editYear.trim() || null,
          source_url: editSourceUrl.trim() || null,
          original_filename: editOriginalFilename.trim() || null
        })
      })

      if (response.ok) {
        toast.success('Source updated')
        setEditingId(null)
        fetchSources()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Error updating:', error)
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Get unique years for dropdown
  const availableYears = [...new Set(
    sources
      .map(s => s.published_date ? s.published_date.split('-')[0] : null)
      .filter((y): y is string => y !== null)
  )].sort((a, b) => parseInt(b) - parseInt(a))

  // Filter and sort sources
  const filteredSources = sources
    .filter(source => {
      // Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
          source.name.toLowerCase().includes(query) ||
          (source.author && source.author.toLowerCase().includes(query))
        )
        if (!matchesSearch) return false
      }

      // Year filter
      if (yearFilter) {
        const sourceYear = source.published_date ? source.published_date.split('-')[0] : ''
        if (sourceYear !== yearFilter) return false
      }

      // Type filter (documents have file_path, news/URLs don't)
      if (typeFilter === 'documents' && !source.file_path) return false
      if (typeFilter === 'news' && source.file_path) return false

      // Missing info filter
      if (missingFilter === 'missing_author' && source.author) return false
      if (missingFilter === 'missing_year' && source.published_date) return false
      if (missingFilter === 'missing_url' && source.source_url) return false
      if (missingFilter === 'any_missing' && source.author && source.published_date && source.source_url) return false

      return true
    })
    .sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'author':
          aVal = (a.author || '').toLowerCase()
          bVal = (b.author || '').toLowerCase()
          break
        case 'year':
          aVal = a.published_date ? parseInt(a.published_date.split('-')[0]) : 0
          bVal = b.published_date ? parseInt(b.published_date.split('-')[0]) : 0
          break
        case 'chunks':
          aVal = a.chunks_count
          bVal = b.chunks_count
          break
        case 'added':
          aVal = a.created_at || ''
          bVal = b.created_at || ''
          break
        case 'updated':
          aVal = a.updated_at || ''
          bVal = b.updated_at || ''
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  // Pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage)
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSortChange = (value: string) => {
    setSortField(value as SortField)
    // Default to descending for date sorts (newest first), ascending for others
    setSortDirection(value === 'added' || value === 'updated' ? 'desc' : 'asc')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const totalChunks = sources.reduce((sum, s) => sum + s.chunks_count, 0)

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
      {/* Hidden RIS file input for citation import */}
      <input
        ref={risInputRef}
        type="file"
        accept=".ris"
        onChange={handleRisImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen size={20} />
            AI Knowledge Base
          </h3>
          <p className="text-sm text-text-tertiary mt-1">
            {sources.length} sources ({totalChunks} chunks)
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
          </div>

          <p className="text-sm text-text-tertiary">
            {inputMode === 'text' && 'Paste text from beekeeping books, guides, or articles.'}
            {inputMode === 'pdf' && 'Upload a PDF file (max 5MB). Text will be extracted automatically.'}
            {inputMode === 'url' && 'Enter a URL to a beekeeping article or guide.'}
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name / Title
              </label>
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="e.g., The Beekeeper's Handbook"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Author
              </label>
              <input
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="e.g., Diana Sammataro"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Year Published
              </label>
              <input
                type="text"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="e.g., 2021"
                maxLength={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Source URL (optional)
              </label>
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://example.com/source"
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
                rows={6}
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-forest-600 file:text-white file:text-sm"
              />
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
              className="px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      {sources.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search by name or author..."
              className="w-full pl-9 pr-9 py-2 border border-border rounded-lg bg-surface text-foreground text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {availableYears.length > 0 && (
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm min-w-[120px]"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as SourceTypeFilter); setCurrentPage(1) }}
            className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm min-w-[130px]"
          >
            <option value="all">All Types</option>
            <option value="documents">Documents</option>
            <option value="news">News/URLs</option>
          </select>
          <select
            value={missingFilter}
            onChange={(e) => { setMissingFilter(e.target.value as MissingFilter); setCurrentPage(1) }}
            className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm min-w-[150px]"
          >
            <option value="all">All Info</option>
            <option value="any_missing">Any Missing Info</option>
            <option value="missing_author">Missing Author</option>
            <option value="missing_year">Missing Year</option>
            <option value="missing_url">Missing URL</option>
          </select>
          <div className="flex items-center gap-1">
            <select
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-surface text-foreground text-sm min-w-[150px]"
            >
              <option value="name">Sort: Name</option>
              <option value="author">Sort: Author</option>
              <option value="year">Sort: Year</option>
              <option value="chunks">Sort: Chunks</option>
              <option value="added">Sort: Recently Added</option>
              <option value="updated">Sort: Recently Edited</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-border rounded-lg hover:bg-surface-secondary text-text-secondary"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>
          {(searchQuery || yearFilter || typeFilter !== 'all' || missingFilter !== 'all') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-tertiary">
                {filteredSources.length} of {sources.length}
              </span>
              <button
                onClick={() => { setSearchQuery(''); setYearFilter(''); setTypeFilter('all'); setMissingFilter('all'); setCurrentPage(1) }}
                className="text-xs text-forest-600 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No knowledge sources yet</p>
          <p className="text-sm">Add beekeeping content to improve AI responses</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-sm font-medium text-text-secondary">Actions</th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary">Name</th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary">Author</th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary">Year</th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary">URL</th>
                <th className="px-4 py-3 text-sm font-medium text-text-secondary text-center">Chunks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSources.map((source) => (
                <tr key={source.id} className="border-b border-border hover:bg-surface-secondary/50">
                  {editingId === source.id ? (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => risInputRef.current?.click()}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                            title="Import from RIS citation"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={saveEditing}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="Save"
                          >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 text-text-secondary hover:bg-surface-secondary rounded"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3" colSpan={4}>
                        <div className="space-y-2">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-text-tertiary mb-0.5">Display Name (for citations)</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="e.g., Nosema Disease - White (1919)"
                                className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="w-48">
                              <label className="block text-xs text-text-tertiary mb-0.5">Author</label>
                              <input
                                type="text"
                                value={editAuthor}
                                onChange={(e) => setEditAuthor(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="Author"
                                className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground text-sm"
                              />
                            </div>
                            <div className="w-20">
                              <label className="block text-xs text-text-tertiary mb-0.5">Year</label>
                              <input
                                type="text"
                                value={editYear}
                                onChange={(e) => setEditYear(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="Year"
                                maxLength={4}
                                className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-text-tertiary mb-0.5">Original Filename</label>
                              <input
                                type="text"
                                value={editOriginalFilename}
                                onChange={(e) => setEditOriginalFilename(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="e.g., White-GF (1919) Nosema-Disease.pdf"
                                className="w-full px-2 py-1 border border-border rounded bg-surface text-text-secondary text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-text-tertiary mb-0.5">Source URL</label>
                              <input
                                type="url"
                                value={editSourceUrl}
                                onChange={(e) => setEditSourceUrl(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="https://example.com/source"
                                className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-text-secondary">
                        {source.chunks_count}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(source)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSource(source.id, source.name, source.chunks_count)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {source.name}
                      </td>
                      <td className={`px-4 py-3 text-sm ${source.author ? 'text-text-secondary' : 'text-amber-500'}`}>
                        {source.author || '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${source.published_date ? 'text-text-secondary' : 'text-amber-500'}`}>
                        {source.published_date ? source.published_date.split('-')[0] : '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${source.source_url ? 'text-text-secondary' : 'text-amber-500'}`}>
                        {source.source_url ? (
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary text-center">
                        {source.chunks_count}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {paginatedSources.length === 0 && (searchQuery || yearFilter || typeFilter !== 'all' || missingFilter !== 'all') && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-tertiary">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No sources match your filters</p>
                    <button
                      onClick={() => { setSearchQuery(''); setYearFilter(''); setTypeFilter('all'); setMissingFilter('all'); setCurrentPage(1) }}
                      className="text-sm text-forest-600 hover:underline mt-1"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <span className="text-sm text-text-tertiary">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredSources.length)} of {filteredSources.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

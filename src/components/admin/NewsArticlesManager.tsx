'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Loader2, Link, Pencil, X, Check, ExternalLink, Search, Eye, EyeOff, DatabaseZap } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import TextLink from '@/components/ui/TextLink'

interface NewsArticle {
  id: string
  url: string
  title: string
  description: string | null
  image_url: string | null
  site_name: string | null
  published_date: string | null
  author: string | null
  is_published: boolean
  kb_source_id: string | null
  created_at: string
}

export default function NewsArticlesManager() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editPublishedDate, setEditPublishedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removingKbId, setRemovingKbId] = useState<string | null>(null)
  const toast = useToast()

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/news-articles?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (response.ok) {
        setArticles(data.data || [])
      } else {
        toast.error(data.error || 'Failed to load articles')
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
      toast.error('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const handleAddArticle = async () => {
    if (!newUrl.trim()) {
      toast.error('Please enter a URL')
      return
    }

    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/news-articles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: newUrl.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Article added${data.kb_ingested ? ' and added to Knowledge Base' : ''}`)
        setNewUrl('')
        setShowAddForm(false)
        fetchArticles()
      } else if (response.status === 409) {
        toast.error(`Article already exists: ${data.existing?.title || 'Unknown'}`)
      } else {
        toast.error(data.error || 'Failed to add article')
      }
    } catch (error) {
      console.error('Error adding article:', error)
      toast.error('Failed to add article')
    } finally {
      setAdding(false)
    }
  }

  const handleEdit = (article: NewsArticle) => {
    setEditingId(article.id)
    setEditTitle(article.title)
    setEditDescription(article.description || '')
    setEditAuthor(article.author || '')
    setEditPublishedDate(article.published_date || '')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/news-articles', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingId,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          author: editAuthor.trim() || null,
          published_date: editPublishedDate || null
        })
      })

      if (response.ok) {
        toast.success('Article updated')
        setEditingId(null)
        fetchArticles()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update article')
      }
    } catch (error) {
      console.error('Error updating article:', error)
      toast.error('Failed to update article')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublished = async (article: NewsArticle) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/news-articles', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: article.id,
          is_published: !article.is_published
        })
      })

      if (response.ok) {
        toast.success(article.is_published ? 'Article unpublished' : 'Article published')
        fetchArticles()
      }
    } catch (error) {
      console.error('Error toggling published:', error)
    }
  }

  const handleDelete = async (article: NewsArticle) => {
    if (!confirm(`Delete "${article.title}"?${article.kb_source_id ? ' This will also remove it from the Knowledge Base.' : ''}`)) {
      return
    }

    setDeletingId(article.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/admin/news-articles?id=${article.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        toast.success('Article deleted')
        fetchArticles()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete article')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Failed to delete article')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRemoveFromKB = async (article: NewsArticle) => {
    if (!confirm(`Remove "${article.title}" from the Knowledge Base? The article will remain in your news list.`)) {
      return
    }

    setRemovingKbId(article.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/news-articles', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: article.id,
          remove_from_kb: true
        })
      })

      if (response.ok) {
        toast.success('Removed from Knowledge Base')
        fetchArticles()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove from Knowledge Base')
      }
    } catch (error) {
      console.error('Error removing from KB:', error)
      toast.error('Failed to remove from Knowledge Base')
    } finally {
      setRemovingKbId(null)
    }
  }

  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      article.title.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query) ||
      article.site_name?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date'
    return new Date(dateStr).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">News Articles</h3>
          <p className="text-sm text-text-secondary">
            {articles.length} article{articles.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 self-start"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Cancel' : 'Add Article'}
        </Button>
      </div>

      {/* Add Article Form */}
      {showAddForm && (
        <div className="bg-surface-elevated border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Article URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/article..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddArticle()}
                />
              </div>
              <Button
                onClick={handleAddArticle}
                disabled={adding || !newUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {adding ? 'Fetching...' : 'Add'}
              </Button>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              Metadata (title, description, image) will be automatically extracted from the URL
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          {searchQuery ? 'No articles match your search' : 'No articles yet. Add one by entering a URL above.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className={`bg-surface-elevated border rounded-lg overflow-hidden ${
                article.is_published ? 'border-border' : 'border-amber-300 dark:border-amber-700'
              }`}
            >
              {editingId === article.id ? (
                // Edit Mode
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-tertiary mb-1">Author</label>
                      <input
                        type="text"
                        value={editAuthor}
                        onChange={(e) => setEditAuthor(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-tertiary mb-1">Published Date</label>
                      <input
                        type="date"
                        value={editPublishedDate}
                        onChange={(e) => setEditPublishedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-sm text-text-secondary hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex">
                  {/* Image */}
                  {article.image_url && (
                    <div className="w-32 h-24 flex-shrink-0 bg-surface-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground line-clamp-1">{article.title}</h4>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {article.site_name || new URL(article.url).hostname} • {formatDate(article.published_date)}
                          {article.author && ` • ${article.author}`}
                        </p>
                        {article.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                            {article.description}
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {article.kb_source_id && (
                          <Button
                            onClick={() => handleRemoveFromKB(article)}
                            disabled={removingKbId === article.id}
                            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 rounded flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                            title="Remove from Knowledge Base"
                          >
                            {removingKbId === article.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <DatabaseZap size={12} />
                            )}
                            KB
                          </Button>
                        )}
                        <Button
                          onClick={() => handleTogglePublished(article)}
                          className={`p-1.5 rounded hover:bg-surface-elevated ${
                            article.is_published ? 'text-green-600' : 'text-amber-500'
                          }`}
                          title={article.is_published ? 'Published (click to hide)' : 'Hidden (click to publish)'}
                        >
                          {article.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                        </Button>
                        <TextLink
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-surface-elevated text-text-secondary"
                          title="Open original"
                        >
                          <ExternalLink size={16} />
                        </TextLink>
                        <Button
                          onClick={() => handleEdit(article)}
                          className="p-1.5 rounded hover:bg-surface-elevated text-text-secondary"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(article)}
                          disabled={deletingId === article.id}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === article.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


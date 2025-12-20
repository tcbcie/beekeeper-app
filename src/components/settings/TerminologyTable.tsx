'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, BookText, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface TerminologyEntry {
  id: string
  english_term: string
  german_term: string
  created_at: string
}

interface EditingTerm {
  id: string | null
  english_term: string
  german_term: string
}

export default function TerminologyTable() {
  const [terms, setTerms] = useState<TerminologyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTerm, setNewTerm] = useState({ english_term: '', german_term: '' })
  const [editingTerm, setEditingTerm] = useState<EditingTerm | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTerminology()
  }, [])

  async function fetchTerminology() {
    setLoading(true)
    const { data, error } = await supabase
      .from('terminology')
      .select('id, english_term, german_term, created_at')
      .order('english_term', { ascending: true })

    if (error) {
      console.error('Error fetching terminology:', error)
    } else {
      setTerms(data || [])
    }
    setLoading(false)
  }

  // Filter terms based on search query
  const filteredTerms = useMemo(() => {
    if (searchQuery === '') return terms
    return terms.filter(term =>
      term.english_term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.german_term.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [terms, searchQuery])

  async function handleAdd() {
    if (!newTerm.english_term.trim() || !newTerm.german_term.trim()) {
      alert('Please fill in both English and German terms')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('terminology')
      .insert([{
        english_term: newTerm.english_term.trim(),
        german_term: newTerm.german_term.trim()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding term:', error)
      alert('Failed to add term. Please try again.')
    } else if (data) {
      setTerms(prev => [...prev, data].sort((a, b) =>
        a.english_term.localeCompare(b.english_term)
      ))
      setNewTerm({ english_term: '', german_term: '' })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  async function handleUpdate() {
    if (!editingTerm || !editingTerm.id) return
    if (!editingTerm.english_term.trim() || !editingTerm.german_term.trim()) {
      alert('Please fill in both English and German terms')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('terminology')
      .update({
        english_term: editingTerm.english_term.trim(),
        german_term: editingTerm.german_term.trim()
      })
      .eq('id', editingTerm.id)

    if (error) {
      console.error('Error updating term:', error)
      alert('Failed to update term. Please try again.')
    } else {
      setTerms(prev => prev.map(t =>
        t.id === editingTerm.id
          ? { ...t, english_term: editingTerm.english_term.trim(), german_term: editingTerm.german_term.trim() }
          : t
      ).sort((a, b) => a.english_term.localeCompare(b.english_term)))
      setEditingTerm(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string, englishTerm: string) {
    if (!confirm(`Delete "${englishTerm}"?`)) return

    const { error } = await supabase
      .from('terminology')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting term:', error)
      alert('Failed to delete term. Please try again.')
    } else {
      setTerms(prev => prev.filter(t => t.id !== id))
    }
  }

  function startEdit(term: TerminologyEntry) {
    setEditingTerm({
      id: term.id,
      english_term: term.english_term,
      german_term: term.german_term
    })
    setShowAddForm(false)
  }

  function cancelEdit() {
    setEditingTerm(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookText className="text-forest-600 dark:text-emerald-500" size={24} />
          <h3 className="text-lg font-semibold text-foreground">
            Beekeeping Terminology (English &lt;&gt; German)
          </h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingTerm(null)
          }}
          className="flex items-center gap-2 px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          Add Term
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 border border-border">
          <h4 className="font-medium text-foreground mb-3">Add New Term</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="English term"
              value={newTerm.english_term}
              onChange={(e) => setNewTerm(prev => ({ ...prev, english_term: e.target.value }))}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <input
              type="text"
              placeholder="German term"
              value={newTerm.german_term}
              onChange={(e) => setNewTerm(prev => ({ ...prev, german_term: e.target.value }))}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewTerm({ english_term: '', german_term: '' })
                }}
                className="flex items-center gap-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" size={18} />
        <input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-text-tertiary">
        Showing {filteredTerms.length} of {terms.length} terms
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 dark:bg-muted/20">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">English</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">German</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTerms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-text-tertiary">
                  No terms found matching your search.
                </td>
              </tr>
            ) : (
              filteredTerms.map((term) => (
                <tr key={term.id} className="hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                  {editingTerm?.id === term.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editingTerm.english_term}
                          onChange={(e) => setEditingTerm(prev => prev ? { ...prev, english_term: e.target.value } : null)}
                          className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editingTerm.german_term}
                          onChange={(e) => setEditingTerm(prev => prev ? { ...prev, german_term: e.target.value } : null)}
                          className="w-full px-2 py-1 border border-border rounded bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/30 rounded transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-foreground font-medium">{term.english_term}</td>
                      <td className="px-4 py-3 text-foreground">{term.german_term}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(term)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(term.id, term.english_term)}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

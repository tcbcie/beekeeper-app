'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, BookText, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import TextInput from '@/components/ui/TextInput'

const ITEMS_PER_PAGE = 15

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
  const toast = useToast()
  const confirm = useConfirm()
  const [terms, setTerms] = useState<TerminologyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTerm, setNewTerm] = useState({ english_term: '', german_term: '' })
  const [editingTerm, setEditingTerm] = useState<EditingTerm | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

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

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Pagination calculations
  const totalPages = Math.ceil(filteredTerms.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTerms = filteredTerms.slice(startIndex, endIndex)

  async function handleAdd() {
    if (!newTerm.english_term.trim() || !newTerm.german_term.trim()) {
      toast.warning('Please fill in both English and German terms')
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
      toast.error('Failed to add term. Please try again.')
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
      toast.warning('Please fill in both English and German terms')
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
      toast.error('Failed to update term. Please try again.')
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
    const confirmed = await confirm({
      title: 'Delete Term',
      message: `Are you sure you want to delete "${englishTerm}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return

    const { error } = await supabase
      .from('terminology')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting term:', error)
      toast.error('Failed to delete term. Please try again.')
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
          className="fj-btn fj-btn-success fj-btn-sm"
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
            <TextInput
              type="text"
              placeholder="English term"
              value={newTerm.english_term}
              onChange={(e) => setNewTerm(prev => ({ ...prev, english_term: e.target.value }))}
              className="flex-1"
            />
            <TextInput
              type="text"
              placeholder="German term"
              value={newTerm.german_term}
              onChange={(e) => setNewTerm(prev => ({ ...prev, german_term: e.target.value }))}
              className="flex-1"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="fj-btn fj-btn-success fj-btn-sm disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewTerm({ english_term: '', german_term: '' })
                }}
                className="fj-btn fj-btn-neutral fj-btn-sm"
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
        <TextInput
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-text-tertiary">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredTerms.length)} of {filteredTerms.length} terms
        {searchQuery && ` (filtered from ${terms.length})`}
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
            {paginatedTerms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-text-tertiary">
                  No terms found matching your search.
                </td>
              </tr>
            ) : (
              paginatedTerms.map((term) => (
                <tr key={term.id} className="hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                  {editingTerm?.id === term.id ? (
                    <>
                      <td className="px-4 py-2">
                        <TextInput
                          type="text"
                          value={editingTerm.english_term}
                          onChange={(e) => setEditingTerm(prev => prev ? { ...prev, english_term: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate()
                            else if (e.key === 'Escape') cancelEdit()
                          }}
                          className="px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <TextInput
                          type="text"
                          value={editingTerm.german_term}
                          onChange={(e) => setEditingTerm(prev => prev ? { ...prev, german_term: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate()
                            else if (e.key === 'Escape') cancelEdit()
                          }}
                          className="px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="fj-icon-btn fj-icon-btn-green p-1.5 disabled:opacity-50"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="fj-icon-btn p-1.5"
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
                            className="fj-icon-btn fj-icon-btn-blue p-1.5"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(term.id, term.english_term)}
                            className="fj-icon-btn fj-icon-btn-danger p-1.5"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="fj-btn fj-btn-neutral fj-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-text-tertiary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="fj-btn fj-btn-neutral fj-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Edit2, Trash2, Save, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import CheckboxInput from '@/components/ui/CheckboxInput'
import TextLink from '@/components/ui/TextLink'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Card from '@/components/ui/Card'
import Surface from '@/components/ui/Surface'
import { TableBody, TableContainer, TableHeaderRow, TableRow } from '@/components/ui/TableStyles'

interface Association {
  id: string
  name: string
  jurisdiction: string
  county_area: string
  affiliation: string | null
  source: string | null
  website: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  contacted: boolean
  comments: string | null
  created_at?: string
  updated_at?: string
}

interface AssociationFormData {
  name: string
  jurisdiction: string
  county_area: string
  affiliation: string
  source: string
  website: string
  email: string
  phone: string
  is_active: boolean
  contacted: boolean
  comments: string
}

const emptyFormData: AssociationFormData = {
  name: '',
  jurisdiction: '',
  county_area: '',
  affiliation: '',
  source: '',
  website: '',
  email: '',
  phone: '',
  is_active: true,
  contacted: false,
  comments: '',
}

export default function AssociationManagement() {
  const toast = useToast()
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Association | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<AssociationFormData>(emptyFormData)
  const [jurisdictionFilter] = useState<'all' | 'NI' | 'ROI'>('all')
  const [countyFilter, setCountyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'county_area' | 'email'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const fetchAssociations = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('beekeeping_associations')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching associations:', error)
        toast.error('Failed to fetch beekeeping associations.')
        return
      }

      setAssociations(data || [])
    } catch (error) {
      console.error('Error fetching associations:', error)
      toast.error('Failed to fetch beekeeping associations.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAssociations()
  }, [fetchAssociations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSave = {
      name: formData.name,
      jurisdiction: formData.jurisdiction,
      county_area: formData.county_area,
      affiliation: formData.affiliation || null,
      source: formData.source || null,
      website: formData.website || null,
      email: formData.email || null,
      phone: formData.phone || null,
      is_active: formData.is_active,
      contacted: formData.contacted,
      comments: formData.comments || null,
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('beekeeping_associations')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)

        if (error) throw error
        toast.success('Beekeeping association updated successfully!')
      } else {
        const { error } = await supabase
          .from('beekeeping_associations')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Beekeeping association added successfully!')
      }

      fetchAssociations()
      resetForm()
    } catch (error) {
      console.error('Error saving beekeeping association:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save beekeeping association: ${errorMessage}`)
    }
  }

  const handleEdit = (association: Association) => {
    setEditing(association)
    setFormData({
      name: association.name,
      jurisdiction: association.jurisdiction,
      county_area: association.county_area,
      affiliation: association.affiliation || '',
      source: association.source || '',
      website: association.website || '',
      email: association.email || '',
      phone: association.phone || '',
      is_active: association.is_active,
      contacted: association.contacted ?? false,
      comments: association.comments || '',
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this beekeeping association? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('beekeeping_associations')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Beekeeping association deleted successfully!')
      fetchAssociations()
    } catch (error) {
      console.error('Error deleting beekeeping association:', error)
      toast.error('Failed to delete beekeeping association.')
    }
  }

  const resetForm = () => {
    setShowAddForm(false)
    setEditing(null)
    setFormData(emptyFormData)
  }

  const handleSort = (field: 'name' | 'county_area' | 'email') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const filteredAndSortedAssociations = associations
    .filter(association => {
      if (jurisdictionFilter !== 'all' && association.jurisdiction !== jurisdictionFilter) {
        return false
      }
      if (countyFilter !== 'all' && association.county_area !== countyFilter) {
        return false
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          association.name.toLowerCase().includes(query) ||
          association.county_area.toLowerCase().includes(query) ||
          (association.email?.toLowerCase().includes(query) ?? false)
        if (!matchesSearch) return false
      }
      return true
    })
    .sort((a, b) => {
      const aValue = (a[sortField] ?? '').toLowerCase()
      const bValue = (b[sortField] ?? '').toLowerCase()
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })

  const totalPages = Math.ceil(filteredAndSortedAssociations.length / itemsPerPage)
  const paginatedAssociations = filteredAndSortedAssociations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const SortIcon = ({ field }: { field: 'name' | 'county_area' | 'email' }) => {
    if (sortField !== field) return <ChevronUp size={14} className="opacity-30" />
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  return (
    <Card padding="none">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Beekeeping Associations</h2>
            <p className="text-text-tertiary mt-2">Manage beekeeping associations across Ireland</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-border pt-6 space-y-4">
        {/* Add Association Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-text-tertiary">
            Beekeeping associations from Northern Ireland and the Republic of Ireland.
          </p>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            tone="success"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancel' : 'Add Association'}
          </Button>
        </div>

        {/* Filters */}
        <Surface padded="sm" elevated={false} className="flex flex-wrap gap-4 items-center bg-surface dark:bg-background">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-secondary">County/Area:</label>
            <SelectField
              value={countyFilter}
              onChange={(e) => { setCountyFilter(e.target.value); setCurrentPage(1) }}
              tone="purple"
              className="fj-control-inline py-1.5 rounded-md text-sm"
            >
              <option value="all">All Counties/Areas</option>
              {Array.from(new Set(associations.map(a => a.county_area))).sort().map(county => (
                <option key={county} value={county}>{county}</option>
              ))}
            </SelectField>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-secondary">Search:</label>
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <TextInput
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                placeholder="Name, email, county..."
                tone="purple"
                className="pl-8 pr-3 py-1.5 rounded-md text-sm w-52"
              />
            </div>
          </div>

          {(countyFilter !== 'all' || searchQuery) && (
            <Button
              onClick={() => {
                setCountyFilter('all')
                setSearchQuery('')
                setCurrentPage(1)
              }}
              tone="neutral"
              size="sm"
              className="ml-auto"
            >
              Clear Filters
            </Button>
          )}
        </Surface>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Surface padded="md" elevated={false} className="bg-surface dark:bg-background">
            <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editing ? 'Edit Association' : 'Add New Association'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Association Name *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>County/Area *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.county_area}
                  onChange={(e) => setFormData({ ...formData, county_area: e.target.value })}
                  className="rounded-md"
                  placeholder="e.g., County Antrim, Dublin"
                  required
                />
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-md"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-md"
                  placeholder="+353 1 234 5678"
                />
              </div>

              <div>
                <FieldLabel>Source</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="rounded-md"
                  placeholder="Data source URL"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckboxInput
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-text-secondary">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <CheckboxInput
                    id="contacted"
                    checked={formData.contacted}
                    onChange={(e) => setFormData({ ...formData, contacted: e.target.checked })}
                  />
                  <label htmlFor="contacted" className="text-sm font-medium text-text-secondary">Contacted</label>
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Comments</FieldLabel>
              <TextAreaField
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="rounded-md"
                placeholder="Additional notes or comments"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                tone="success"
                className="px-6"
              >
                <Save size={16} />
                {editing ? 'Update' : 'Add'} Association
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                tone="neutral"
                className="px-6"
              >
                Cancel
              </Button>
            </div>
            </form>
          </Surface>
        )}

        {/* Associations Table */}
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner text="Loading associations..." />
          </div>
        ) : associations.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No associations found. Add your first association above.
          </div>
        ) : filteredAndSortedAssociations.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No associations match the selected filters.
          </div>
        ) : (
          <>
            <TableContainer>
              <table className="w-full border-collapse">
                <thead>
                  <TableHeaderRow>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Association Name
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('county_area')}
                    >
                      <div className="flex items-center gap-1">
                        County/Area
                        <SortIcon field="county_area" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        Email
                        <SortIcon field="email" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Contacted</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Comments</th>
                  </TableHeaderRow>
                </thead>
                <TableBody>
                  {paginatedAssociations.map((association) => (
                    <TableRow key={association.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <IconButton
                            onClick={() => handleEdit(association)}
                            tone="blue"
                            size="xs"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(association.id)}
                            tone="danger"
                            size="xs"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{association.name}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{association.county_area}</td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {association.email ? (
                          <TextLink href={`mailto:${association.email}`} tone="info">
                            {association.email}
                          </TextLink>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {association.contacted ? '✓' : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-[200px] truncate" title={association.comments || ''}>
                        {association.comments || '-'}
                      </td>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-text-tertiary">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedAssociations.length)} of {filteredAndSortedAssociations.length} associations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    tone="neutral"
                    size="xs"
                    className="border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </Button>
                  <IconButton
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    size="sm"
                    className="border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </IconButton>
                  <span className="px-3 py-1.5 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <IconButton
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    size="sm"
                    className="border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                  <Button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    tone="neutral"
                    size="xs"
                    className="border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

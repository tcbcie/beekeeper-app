'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Search, Plus, Edit2, Trash2, X, Download, ExternalLink } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Queen {
  id: string
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  subspecies: string
  lineage: string
  queen_clipped: boolean
  status: string
  performance_notes: string
  mated_at_eircode: string
  created_at?: string
  hives?: {
    id: string
    hive_number: string
    apiaries?: {
      name: string
    }
  }
}

interface FormData {
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  subspecies: string
  lineage: string
  queen_clipped: boolean
  status: string
  performance_notes: string
  mated_at_eircode: string
}

// Calculate queen marking color based on birth year
// International color coding: White=1,6 | Yellow=2,7 | Red=3,8 | Green=4,9 | Blue=5,0
const getQueenColorFromYear = (birthDate: string): string => {
  if (!birthDate) return ''
  const year = new Date(birthDate).getFullYear()
  const lastDigit = year % 10

  switch (lastDigit) {
    case 1:
    case 6:
      return 'White'
    case 2:
    case 7:
      return 'Yellow'
    case 3:
    case 8:
      return 'Red'
    case 4:
    case 9:
      return 'Green'
    case 5:
    case 0:
      return 'Blue'
    default:
      return ''
  }
}

// Calculate queen age from birth date
const calculateQueenAge = (birthDate: string): string => {
  if (!birthDate) return 'N/A'

  const birth = new Date(birthDate)
  const today = new Date()
  const ageInDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))

  if (ageInDays < 0) return 'Future date'
  if (ageInDays === 0) return 'Today'
  if (ageInDays === 1) return '1 day'
  if (ageInDays < 7) return `${ageInDays} days`
  if (ageInDays < 30) {
    const weeks = Math.floor(ageInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''}`
  }
  if (ageInDays < 365) {
    const months = Math.floor(ageInDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }

  const years = Math.floor(ageInDays / 365)
  const remainingMonths = Math.floor((ageInDays % 365) / 30)

  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`
  }
  return `${years}y ${remainingMonths}m`
}

export default function QueensPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const highlightedQueenId = searchParams.get('id')
  const queenRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const [queens, setQueens] = useState<Queen[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingQueen, setEditingQueen] = useState<Queen | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [subspeciesOptions, setSubspeciesOptions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    queen_number: '',
    birth_date: '',
    marking_color: '',
    source: 'bred',
    subspecies: '',
    lineage: '',
    queen_clipped: false,
    status: 'active',
    performance_notes: '',
    mated_at_eircode: '',
  })

  const fetchQueens = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // First get all queens
    const { data: queensData, error: queensError } = await supabase
      .from('queens')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (queensError) {
      console.error('Error fetching queens:', queensError)
      setLoading(false)
      return
    }

    // Then enrich with hive and apiary data
    if (queensData && queensData.length > 0) {
      const enrichedQueens = await Promise.all(
        queensData.map(async (queen) => {
          if (!queen.id) return queen

          // Find hive that has this queen
          const { data: hiveData } = await supabase
            .from('hives')
            .select(`
              id,
              hive_number,
              apiaries (
                name
              )
            `)
            .eq('queen_id', queen.id)
            .eq('user_id', currentUserId)
            .eq('status', 'active')
            .single()

          return {
            ...queen,
            hives: hiveData || undefined
          }
        })
      )
      setQueens(enrichedQueens as Queen[])
    } else {
      setQueens([])
    }

    setLoading(false)
  }, [userId])

  const fetchSubspeciesOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from('dropdown_categories')
      .select(`
        id,
        dropdown_values (
          value,
          is_active,
          display_order
        )
      `)
      .eq('category_key', 'bee_subspecies')
      .single()

    if (!error && data && data.dropdown_values) {
      interface DropdownValue {
        is_active: boolean
        display_order: number
        value: string
      }
      const activeValues = (data.dropdown_values as DropdownValue[])
        .filter((v) => v.is_active)
        .sort((a, b) => a.display_order - b.display_order)
        .map((v) => v.value)
      setSubspeciesOptions(activeValues)
    }
  }, [])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchQueens(id)
      fetchSubspeciesOptions()
    }
    initUser()
  }, [router, fetchQueens, fetchSubspeciesOptions])

  // Scroll to highlighted queen when data loads
  useEffect(() => {
    if (highlightedQueenId && queens.length > 0) {
      const queenElement = queenRefs.current[highlightedQueenId]
      if (queenElement) {
        setTimeout(() => {
          queenElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [highlightedQueenId, queens])

  // Auto-calculate color when birth date changes
  useEffect(() => {
    if (formData.birth_date) {
      const calculatedColor = getQueenColorFromYear(formData.birth_date)
      if (calculatedColor && calculatedColor !== formData.marking_color) {
        setFormData(prev => ({ ...prev, marking_color: calculatedColor }))
      }
    }
  }, [formData.birth_date, formData.marking_color])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      if (editingQueen) {
        const { error } = await supabase
          .from('queens')
          .update(formData)
          .eq('id', editingQueen.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('queens').insert([{ ...formData, user_id: userId }])
        if (error) throw error
      }

      fetchQueens()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (queen: Queen) => {
    setEditingQueen(queen)
    setFormData({
      queen_number: queen.queen_number,
      birth_date: queen.birth_date,
      marking_color: queen.marking_color,
      source: queen.source,
      subspecies: queen.subspecies,
      lineage: queen.lineage,
      queen_clipped: queen.queen_clipped || false,
      status: queen.status,
      performance_notes: queen.performance_notes,
      mated_at_eircode: queen.mated_at_eircode || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this queen?')) {
      const { error } = await supabase.from('queens').delete().eq('id', id).eq('user_id', userId)
      if (!error) fetchQueens()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingQueen(null)
    setFormData({
      queen_number: '',
      birth_date: '',
      marking_color: '',
      source: 'bred',
      subspecies: '',
      lineage: '',
      queen_clipped: false,
      status: 'active',
      performance_notes: '',
      mated_at_eircode: '',
    })
  }

  const exportCSV = () => {
    const csv = [
      ['Queen Number', 'Age', 'Color', 'Hive', 'Apiary', 'Lineage', 'Status'],
      ...filteredQueens.map((q) => [
        q.queen_number,
        calculateQueenAge(q.birth_date),
        q.marking_color,
        q.hives?.hive_number || 'N/A',
        q.hives?.apiaries?.name || 'N/A',
        q.lineage,
        q.status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `queens-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredQueens = queens.filter(
    (q) =>
      q.queen_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subspecies && q.subspecies.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const colorOptions = ['White', 'Yellow', 'Red', 'Green', 'Blue', 'None']

  if (loading) return <LoadingSpinner text="Loading queens..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Queens 👑</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-2"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Add Queen'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingQueen ? 'Edit Queen' : 'Add New Queen'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Queen Number *
              </label>
              <input
                type="text"
                value={formData.queen_number}
                onChange={(e) => setFormData({ ...formData, queen_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marking Color
                {formData.birth_date && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (Auto-set based on birth year)
                  </span>
                )}
              </label>
              <select
                value={formData.marking_color}
                onChange={(e) => setFormData({ ...formData, marking_color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select color</option>
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="bred">Bred</option>
                <option value="purchased">Purchased</option>
                <option value="swarm">Swarm</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subspecies</label>
              <select
                value={formData.subspecies}
                onChange={(e) => setFormData({ ...formData, subspecies: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select subspecies</option>
                {subspeciesOptions.map((subspecies) => (
                  <option key={subspecies} value={subspecies}>
                    {subspecies}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lineage</label>
              <input
                type="text"
                value={formData.lineage}
                onChange={(e) => setFormData({ ...formData, lineage: e.target.value })}
                placeholder="e.g., Queen's mother/breeder line"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mated at (Eircode)
              </label>
              <input
                type="text"
                value={formData.mated_at_eircode}
                onChange={(e) => setFormData({ ...formData, mated_at_eircode: e.target.value.toUpperCase() })}
                placeholder="e.g., H91 E6K2"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Irish postcode where the queen was mated
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="retired">Retired</option>
                <option value="dead">Dead</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="queen_clipped"
                checked={formData.queen_clipped}
                onChange={(e) => setFormData({ ...formData, queen_clipped: e.target.checked })}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <label htmlFor="queen_clipped" className="ml-2 text-sm font-medium text-gray-700">
                Queen Clipped
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Performance Notes
              </label>
              <textarea
                value={formData.performance_notes}
                onChange={(e) =>
                  setFormData({ ...formData, performance_notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                {editingQueen ? 'Update' : 'Add'} Queen
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by queen number or subspecies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Queen Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hive
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Apiary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lineage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mated at
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQueens.map((queen) => (
                <tr
                  key={queen.id}
                  ref={(el) => {
                    queenRefs.current[queen.id] = el
                  }}
                  className={`transition-all duration-500 ${
                    highlightedQueenId === queen.id
                      ? 'bg-blue-100 hover:bg-blue-150 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                    <button
                      onClick={() => handleEdit(queen)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(queen.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {queen.queen_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                    {calculateQueenAge(queen.birth_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        queen.marking_color === 'Yellow'
                          ? 'bg-yellow-100 text-yellow-800'
                          : queen.marking_color === 'Red'
                          ? 'bg-red-100 text-red-800'
                          : queen.marking_color === 'Green'
                          ? 'bg-green-100 text-green-800'
                          : queen.marking_color === 'Blue'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {queen.marking_color || 'None'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {queen.hives?.id ? (
                      <Link
                        href={`/dashboard/hives`}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
                      >
                        {queen.hives.hive_number}
                        <ExternalLink size={12} />
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {queen.hives?.apiaries?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {queen.lineage || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {queen.mated_at_eircode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        queen.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {queen.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredQueens.length === 0 && (
            <div className="text-center py-8 text-gray-500">No queens found</div>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Edit2, Trash2, X, Download } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Queen {
  id: string
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  genetics: string
  status: string
  performance_notes: string
  created_at?: string
}

interface FormData {
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  genetics: string
  status: string
  performance_notes: string
}

export default function QueensPage() {
  const [queens, setQueens] = useState<Queen[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingQueen, setEditingQueen] = useState<Queen | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    queen_number: '',
    birth_date: '',
    marking_color: '',
    source: 'bred',
    genetics: '',
    status: 'active',
    performance_notes: '',
  })

  useEffect(() => {
    fetchQueens()
  }, [])

  const fetchQueens = async () => {
    const { data, error } = await supabase
      .from('queens')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setQueens(data as Queen[])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingQueen) {
        const { error } = await supabase
          .from('queens')
          .update(formData)
          .eq('id', editingQueen.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('queens').insert([formData])
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
      genetics: queen.genetics,
      status: queen.status,
      performance_notes: queen.performance_notes,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this queen?')) {
      const { error } = await supabase.from('queens').delete().eq('id', id)
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
      genetics: '',
      status: 'active',
      performance_notes: '',
    })
  }

  const exportCSV = () => {
    const csv = [
      ['Queen Number', 'Birth Date', 'Color', 'Genetics', 'Status'],
      ...filteredQueens.map((q) => [
        q.queen_number,
        q.birth_date,
        q.marking_color,
        q.genetics,
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
      (q.genetics && q.genetics.toLowerCase().includes(searchTerm.toLowerCase()))
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Genetics</label>
              <input
                type="text"
                value={formData.genetics}
                onChange={(e) => setFormData({ ...formData, genetics: e.target.value })}
                placeholder="e.g., Buckfast, Italian"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
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
              placeholder="Search by queen number or genetics..."
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
                  Queen Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Birth Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Genetics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQueens.map((queen) => (
                <tr key={queen.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {queen.queen_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {queen.birth_date || 'N/A'}
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
                    {queen.genetics || 'N/A'}
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
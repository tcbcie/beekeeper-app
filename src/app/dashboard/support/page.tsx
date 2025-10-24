'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { MessageCircle, Plus, Edit2, X, AlertCircle, Lightbulb, Clock, CheckCircle, XCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SupportTicket {
  id: string
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface FormData {
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
}

export default function SupportPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    ticket_type: 'problem',
    subject: '',
    description: '',
  })

  const fetchTickets = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
    } else if (data) {
      setTickets(data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchTickets(id)
    }
    initUser()
  }, [router, fetchTickets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const submitData = {
        ...formData,
        user_id: userId,
      }

      if (editingTicket) {
        // Update existing ticket (only subject and description)
        const { error } = await supabase
          .from('support_tickets')
          .update({
            subject: formData.subject,
            description: formData.description,
          })
          .eq('id', editingTicket.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Create new ticket
        const { error } = await supabase
          .from('support_tickets')
          .insert([submitData])

        if (error) throw error
      }

      fetchTickets()
      resetForm()
    } catch (error) {
      console.error('Error submitting ticket:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleEdit = (ticket: SupportTicket) => {
    // Only allow editing if ticket is still open
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      alert('Cannot edit resolved or closed tickets')
      return
    }

    setEditingTicket(ticket)
    setFormData({
      ticket_type: ticket.ticket_type,
      subject: ticket.subject,
      description: ticket.description,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTicket(null)
    setFormData({
      ticket_type: 'problem',
      subject: '',
      description: '',
    })
  }

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to close this ticket? You will not be able to edit it after closing.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticketId)
        .eq('user_id', userId)

      if (error) throw error

      fetchTickets()
    } catch (error) {
      console.error('Error closing ticket:', error)
      alert(error instanceof Error ? error.message : 'Failed to close ticket')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    }
    return badges[status as keyof typeof badges] || badges.open
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock size={16} />
      case 'in_progress':
        return <AlertCircle size={16} />
      case 'resolved':
        return <CheckCircle size={16} />
      case 'closed':
        return <XCircle size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    }
    return badges[priority as keyof typeof badges] || badges.normal
  }

  if (loading) return <LoadingSpinner text="Loading support tickets..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MessageCircle size={32} className="text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Support</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      <p className="text-gray-600">
        Have a problem or suggestion? Submit a support ticket and our team will get back to you.
      </p>

      {/* New/Edit Ticket Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticket Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ticket_type: 'problem' })}
                  className={`p-4 border-2 rounded-lg transition-colors flex items-center gap-3 ${
                    formData.ticket_type === 'problem'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={!!editingTicket}
                >
                  <AlertCircle size={20} className="text-red-600" />
                  <div className="text-left">
                    <div className="font-semibold">Problem</div>
                    <div className="text-xs text-gray-500">Report an issue</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ticket_type: 'suggestion' })}
                  className={`p-4 border-2 rounded-lg transition-colors flex items-center gap-3 ${
                    formData.ticket_type === 'suggestion'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={!!editingTicket}
                >
                  <Lightbulb size={20} className="text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Suggestion</div>
                    <div className="text-xs text-gray-500">Share an idea</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Brief summary of your issue or suggestion"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Please provide as much detail as possible..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingTicket ? 'Update Ticket' : 'Submit Ticket'}
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

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow">
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No support tickets yet. Create your first ticket above!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {ticket.ticket_type === 'problem' ? (
                      <AlertCircle size={20} className="text-red-600" />
                    ) : (
                      <Lightbulb size={20} className="text-blue-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                      <button
                        onClick={() => handleEdit(ticket)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit2 size={16} />
                        <span className="text-sm">Edit</span>
                      </button>
                    )}
                    {ticket.status !== 'closed' && (
                      <button
                        onClick={() => handleCloseTicket(ticket.id)}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <XCircle size={16} />
                        <span className="text-sm">Close</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusBadge(
                      ticket.status
                    )}`}
                  >
                    {getStatusIcon(ticket.status)}
                    {ticket.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadge(
                      ticket.priority
                    )}`}
                  >
                    {ticket.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-600">
                    {ticket.ticket_type.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{ticket.description}</p>

                {ticket.admin_notes && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Admin Response:</p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{ticket.admin_notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
                  <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

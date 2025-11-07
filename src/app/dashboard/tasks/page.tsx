'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Calendar, Plus, X, CheckCircle2, Circle, Edit2, Trash2, Filter } from 'lucide-react'

interface TaskEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  event_type: 'task' | 'event' | 'reminder'
  category: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  start_date: string
  start_time: string | null
  end_date: string | null
  end_time: string | null
  all_day: boolean
  completed: boolean
  completed_at: string | null
  hive_id: string | null
  apiary_id: string | null
  batch_id: string | null
  reminder_enabled: boolean
  reminder_minutes_before: number
  notes: string | null
  created_at: string
  updated_at: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
}

interface Apiary {
  id: string
  name: string
}

interface Batch {
  id: string
  batch_name: string
}

export default function TasksEventsPage() {
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string>('')
  const [tasks, setTasks] = useState<TaskEvent[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskEvent | null>(null)

  // Filter states
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [filterHive, setFilterHive] = useState<string>('all')
  const [filterApiary, setFilterApiary] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'task' as 'task' | 'event' | 'reminder',
    category: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    hive_id: '',
    apiary_id: '',
    batch_id: '',
    reminder_enabled: false,
    reminder_minutes_before: 60,
    notes: ''
  })

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Fetch tasks/events
  const fetchTasks = useCallback(async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }, [userId])

  // Fetch hives, apiaries, batches for associations
  const fetchAssociations = useCallback(async () => {
    if (!userId) return

    const [hivesRes, apiariesRes, batchesRes] = await Promise.all([
      supabase.from('hives').select('id, hive_number, apiary_id').eq('user_id', userId).order('hive_number'),
      supabase.from('apiaries').select('id, name').eq('user_id', userId).order('name'),
      supabase.from('rearing_batches').select('id, batch_name').eq('user_id', userId).order('batch_name')
    ])

    if (hivesRes.data) setHives(hivesRes.data as Hive[])
    if (apiariesRes.data) setApiaries(apiariesRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchTasks()
      fetchAssociations()
    }
  }, [userId, fetchTasks, fetchAssociations])

  // Handle URL parameters for opening form with pre-filled hive
  useEffect(() => {
    const create = searchParams.get('create')
    const hiveId = searchParams.get('hive')

    if (hiveId && hives.length > 0) {
      // Find the hive to get its apiary_id
      const selectedHive = hives.find(h => h.id === hiveId)

      // Set filter to the specific hive
      setFilterHive(hiveId)

      // If create=true, open form with pre-filled hive and apiary
      if (create === 'true' && selectedHive) {
        setFormData(prev => ({
          ...prev,
          hive_id: hiveId,
          apiary_id: selectedHive.apiary_id || '',
          start_date: new Date().toISOString().split('T')[0] // Set today's date
        }))
        setShowForm(true)
      }
    }
  }, [searchParams, hives])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const taskData = {
      user_id: userId,
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      category: formData.category || null,
      priority: formData.priority,
      start_date: formData.start_date,
      start_time: formData.start_time || null,
      end_date: formData.end_date || null,
      end_time: formData.end_time || null,
      all_day: formData.all_day,
      hive_id: formData.hive_id || null,
      apiary_id: formData.apiary_id || null,
      batch_id: formData.batch_id || null,
      reminder_enabled: formData.reminder_enabled,
      reminder_minutes_before: formData.reminder_minutes_before,
      notes: formData.notes || null,
      completed: false
    }

    if (editingTask) {
      const { error } = await supabase
        .from('tasks_events')
        .update(taskData)
        .eq('id', editingTask.id)

      if (error) {
        alert('Error updating task: ' + error.message)
      } else {
        await fetchTasks()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('tasks_events')
        .insert([taskData])

      if (error) {
        alert('Error creating task: ' + error.message)
      } else {
        await fetchTasks()
        resetForm()
      }
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'task',
      category: '',
      priority: 'normal',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      all_day: false,
      hive_id: '',
      apiary_id: '',
      batch_id: '',
      reminder_enabled: false,
      reminder_minutes_before: 60,
      notes: ''
    })
    setEditingTask(null)
    setShowForm(false)
  }

  // Edit task
  const handleEdit = (task: TaskEvent) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      event_type: task.event_type,
      category: task.category || '',
      priority: task.priority,
      start_date: task.start_date,
      start_time: task.start_time || '',
      end_date: task.end_date || '',
      end_time: task.end_time || '',
      all_day: task.all_day,
      hive_id: task.hive_id || '',
      apiary_id: task.apiary_id || '',
      batch_id: task.batch_id || '',
      reminder_enabled: task.reminder_enabled,
      reminder_minutes_before: task.reminder_minutes_before,
      notes: task.notes || ''
    })
    setEditingTask(task)
    setShowForm(true)
  }

  // Delete task
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task/event?')) return

    const { error } = await supabase
      .from('tasks_events')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting task: ' + error.message)
    } else {
      await fetchTasks()
    }
  }

  // Toggle completion
  const toggleComplete = async (task: TaskEvent) => {
    const { error } = await supabase
      .from('tasks_events')
      .update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null
      })
      .eq('id', task.id)

    if (error) {
      alert('Error updating task: ' + error.message)
    } else {
      await fetchTasks()
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterType !== 'all' && task.event_type !== filterType) return false
    if (filterCategory !== 'all' && task.category !== filterCategory) return false
    if (filterStatus === 'completed' && !task.completed) return false
    if (filterStatus === 'active' && task.completed) return false
    if (filterHive !== 'all' && task.hive_id !== filterHive) return false
    if (filterApiary !== 'all' && task.apiary_id !== filterApiary) return false
    return true
  })

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Task'
      case 'event': return 'Event'
      case 'reminder': return 'Reminder'
      default: return type
    }
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'General'
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-responsive-3xl font-bold text-gray-900 mb-6">Tasks & Events 📅</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-responsive-3xl font-bold text-gray-900">Tasks & Events 📅</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add Task/Event</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="event">Events</option>
              <option value="reminder">Reminders</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="inspection">Inspection</option>
              <option value="treatment">Treatment</option>
              <option value="feeding">Feeding</option>
              <option value="harvest">Harvest</option>
              <option value="queen_rearing">Queen Rearing</option>
              <option value="maintenance">Maintenance</option>
              <option value="general">General</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hive</label>
            <select
              value={filterHive}
              onChange={(e) => setFilterHive(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Hives</option>
              {hives.map(hive => (
                <option key={hive.id} value={hive.id}>Hive {hive.hive_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
            <select
              value={filterApiary}
              onChange={(e) => setFilterApiary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Apiaries</option>
              {apiaries.map(apiary => (
                <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No tasks or events found</p>
          <p className="text-sm text-gray-500">Create your first task or event to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                task.completed ? 'border-green-500 opacity-60' : 'border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Completion checkbox */}
                  <button
                    onClick={() => toggleComplete(task)}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Circle size={20} className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <h3 className={`font-semibold text-gray-900 ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {getTypeLabel(task.event_type)}
                      </span>
                      {task.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          {getCategoryLabel(task.category)}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(task.start_date)}</span>
                        {task.start_time && !task.all_day && (
                          <span>at {formatTime(task.start_time)}</span>
                        )}
                        {task.all_day && <span>(All day)</span>}
                      </div>

                      {task.end_date && task.end_date !== task.start_date && (
                        <div className="flex items-center gap-1">
                          <span>to {formatDate(task.end_date)}</span>
                          {task.end_time && !task.all_day && (
                            <span>at {formatTime(task.end_time)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Associations */}
                    {(task.hive_id || task.apiary_id || task.batch_id) && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                        {task.hive_id && (
                          <span className="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                            Hive: {hives.find(h => h.id === task.hive_id)?.hive_number || 'Unknown'}
                          </span>
                        )}
                        {task.apiary_id && (
                          <span className="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                            Apiary: {apiaries.find(a => a.id === task.apiary_id)?.name || 'Unknown'}
                          </span>
                        )}
                        {task.batch_id && (
                          <span className="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                            Batch: {batches.find(b => b.id === task.batch_id)?.batch_name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(task)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTask ? 'Edit Task/Event' : 'Create Task/Event'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Type, Category, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'task' | 'event' | 'reminder' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="task">Task</option>
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    <option value="inspection">Inspection</option>
                    <option value="treatment">Treatment</option>
                    <option value="feeding">Feeding</option>
                    <option value="harvest">Harvest</option>
                    <option value="queen_rearing">Queen Rearing</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="general">General</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Start Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              {/* End Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              {/* All Day */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="all_day" className="text-sm font-medium text-gray-700">
                  All day event
                </label>
              </div>

              {/* Associations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hive</label>
                  <select
                    value={formData.hive_id}
                    onChange={(e) => {
                      const selectedHiveId = e.target.value
                      const selectedHive = hives.find(h => h.id === selectedHiveId)
                      setFormData({
                        ...formData,
                        hive_id: selectedHiveId,
                        apiary_id: selectedHive?.apiary_id || ''
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {hives.map(hive => (
                      <option key={hive.id} value={hive.id}>Hive {hive.hive_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
                  <select
                    value={formData.apiary_id}
                    onChange={(e) => setFormData({ ...formData, apiary_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {apiaries.map(apiary => (
                      <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminder */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="reminder_enabled"
                    checked={formData.reminder_enabled}
                    onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-700">
                    Enable reminder
                  </label>
                </div>
                {formData.reminder_enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remind me (minutes before)
                    </label>
                    <input
                      type="number"
                      value={formData.reminder_minutes_before}
                      onChange={(e) => setFormData({ ...formData, reminder_minutes_before: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Calendar, Plus, X, CheckCircle2, Circle, Edit2, Trash2, Filter, ClipboardList, Printer } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import CheckboxInput from '@/components/ui/CheckboxInput'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Badge from '@/components/ui/Badge'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import Surface from '@/components/ui/Surface'
import { formatLocalDate, toLocalDateString } from '@/lib/date-utils'

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
  equipment_needed: string | null
  created_at: string
  updated_at: string
  is_team_task?: boolean
  creator_name?: string
  creator_email?: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  user_id: string
  is_shared?: boolean
}

interface Apiary {
  id: string
  name: string
  is_shared?: boolean
}

interface Batch {
  id: string
  batch_name: string
}

export default function TasksEventsPage() {
  const searchParams = useSearchParams()
  const toast = useToast()
  const [userId, setUserId] = useState<string>('')
  const [tasks, setTasks] = useState<TaskEvent[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskEvent | null>(null)
  const [isTeamMember, setIsTeamMember] = useState(false)

  // Filter states
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [filterHive, setFilterHive] = useState<string>('all')
  const [filterApiary, setFilterApiary] = useState<string>('all')
  const [filterOwnership, setFilterOwnership] = useState<'all' | 'my' | 'team'>('all')
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistApiaryId, setChecklistApiaryId] = useState<string>('all')
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null)
  const appliedTaskDeepLinkRef = useRef<string | null>(null)
  const appliedApiaryFilterRef = useRef<string | null>(null)
  const scrolledTaskRef = useRef<string | null>(null)

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
    notes: '',
    equipment_needed: ''
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

  // Fetch tasks/events (RLS handles permissions - both own and team tasks)
  const fetchTasks = useCallback(async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('tasks_events')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
      return
    }

    // Get unique user IDs from tasks
    const uniqueUserIds = [...new Set(data?.map(task => task.user_id) || [])]

    // Fetch profile names and emails for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uniqueUserIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Create a map of user_id to profile info
    const profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, email: p.email }]) || [])

    // Add creator_name and creator_email to tasks
    const tasksWithCreatorNames = (data || []).map(task => {
      const profile = profileMap.get(task.user_id)
      return {
        ...task,
        creator_name: profile?.full_name || null,
        creator_email: profile?.email || null
      }
    })

    setTasks(tasksWithCreatorNames)
    setLoading(false)
  }, [userId])

  // Fetch hives, apiaries, batches for associations (both own and shared)
  const fetchAssociations = useCallback(async () => {
    if (!userId) return

    // Fetch own hives and apiaries
    const [ownHivesRes, ownApiariesRes, batchesRes] = await Promise.all([
      supabase.from('hives').select('id, hive_number, apiary_id, user_id').eq('user_id', userId).is('archived_at', null).order('hive_number'),
      supabase.from('apiaries').select('id, name').eq('user_id', userId).order('name'),
      supabase.from('rearing_batches').select('id, batch_name').eq('user_id', userId).order('batch_name')
    ])

    if (ownHivesRes.error || ownApiariesRes.error || batchesRes.error) {
      console.error('Error fetching associations:', ownHivesRes.error || ownApiariesRes.error || batchesRes.error)
      toast.error('Error loading hives or apiaries. Please refresh.')
      return
    }

    const ownHives = (ownHivesRes.data || []) as Hive[]
    const ownApiaries = (ownApiariesRes.data || []) as Apiary[]

    // Fetch team memberships
    const { data: teamMemberships, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    if (teamError) {
      console.error('Error fetching team memberships:', teamError)
    }

    const teamIds = (teamMemberships || []).map(tm => tm.team_id)

    // Set team member status
    setIsTeamMember(teamIds.length > 0)

    // Fetch shared hives and apiaries if user is in any teams
    let sharedHives: Hive[] = []
    let sharedApiaries: Apiary[] = []

    if (teamIds.length > 0) {
      // Fetch shared apiaries via team_apiaries
      const { data: teamApiariesData, error: teamApiariesError } = await supabase
        .from('team_apiaries')
        .select('apiaries(id, name)')
        .in('team_id', teamIds)

      if (teamApiariesError) {
        console.error('Error fetching team apiaries:', teamApiariesError)
      }

      if (teamApiariesData) {
        const extractedApiaries = teamApiariesData
          .map(ta => ta.apiaries)
          .filter(Boolean)
          .flat()

        sharedApiaries = extractedApiaries.map(a => ({
          id: a.id,
          name: a.name,
          is_shared: true
        }))
      }

      // Fetch shared hives from those apiaries
      const sharedApiaryIds = sharedApiaries.map(a => a.id)
      if (sharedApiaryIds.length > 0) {
        const { data: sharedHivesData, error: sharedHivesError } = await supabase
          .from('hives')
          .select('id, hive_number, apiary_id, user_id')
          .in('apiary_id', sharedApiaryIds)
          .is('archived_at', null)

        if (sharedHivesError) {
          console.error('Error fetching shared hives:', sharedHivesError)
        }

        sharedHives = (sharedHivesData || []).map(h => ({ ...h, is_shared: true }))
      }
    }

    // Combine own and shared resources, deduplicating by id
    const ownHiveIds = new Set(ownHives.map(h => h.id))
    const ownApiaryIds = new Set(ownApiaries.map(a => a.id))
    setHives([...ownHives, ...sharedHives.filter(h => !ownHiveIds.has(h.id))])
    setApiaries([...ownApiaries, ...sharedApiaries.filter(a => !ownApiaryIds.has(a.id))])
    if (batchesRes.data) setBatches(batchesRes.data)
  }, [userId, toast])

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
          start_date: toLocalDateString(new Date())
        }))
        setShowForm(true)
      }
    }
  }, [searchParams, hives])

  // Handle ?apiary= param for pre-filtering by apiary (apply once only)
  // Also open form if ?create=true&apiary= (no hive needed)
  useEffect(() => {
    const apiaryId = searchParams.get('apiary')
    if (apiaryId && appliedApiaryFilterRef.current !== apiaryId) {
      appliedApiaryFilterRef.current = apiaryId
      setFilterApiary(apiaryId)
      if (searchParams.get('create') === 'true') {
        setFormData(prev => ({ ...prev, apiary_id: apiaryId, start_date: toLocalDateString(new Date()) }))
        setShowForm(true)
      }
    }
  }, [searchParams])

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (!taskId || tasks.length === 0 || appliedTaskDeepLinkRef.current === taskId) return

    const targetTask = tasks.find(task => task.id === taskId)
    if (!targetTask) return

    setFilterType('all')
    setFilterCategory('all')
    setFilterOwnership('all')
    setFilterHive(targetTask.hive_id || 'all')
    setFilterApiary(targetTask.apiary_id || 'all')
    setFilterStatus(targetTask.completed ? 'completed' : 'active')
    setHighlightedTaskId(taskId)
    appliedTaskDeepLinkRef.current = taskId
    scrolledTaskRef.current = null
  }, [searchParams, tasks])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate end date is not before start date
    if (formData.end_date && formData.end_date < formData.start_date) {
      toast.error('End date cannot be before start date.')
      return
    }

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
      equipment_needed: formData.equipment_needed || null,
      completed: false
    }

    if (editingTask) {
      const { error } = await supabase
        .from('tasks_events')
        .update(taskData)
        .eq('id', editingTask.id)

      if (error) {
        toast.error('Error updating task: ' + error.message)
      } else {
        await fetchTasks()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('tasks_events')
        .insert([taskData])

      if (error) {
        toast.error('Error creating task: ' + error.message)
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
      notes: '',
      equipment_needed: ''
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
      notes: task.notes || '',
      equipment_needed: task.equipment_needed || ''
    })
    setEditingTask(task)
    setShowForm(true)
  }

  // Delete task
  const handleDelete = async (id: string) => {
    // Find the task to check ownership
    const task = tasks.find(t => t.id === id)

    if (task && task.user_id !== userId) {
      toast.warning('You cannot delete this task because it was created by another team member. Only the task creator can delete it.')
      return
    }

    if (!confirm('Are you sure you want to delete this task/event?')) return

    const { error } = await supabase
      .from('tasks_events')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting task: ' + error.message)
    } else {
      await fetchTasks()
    }
  }

  // Toggle completion
  const toggleComplete = async (task: TaskEvent) => {
    if (togglingIds.has(task.id)) return
    setTogglingIds(prev => new Set(prev).add(task.id))

    try {
      const { error } = await supabase
        .from('tasks_events')
        .update({
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : null
        })
        .eq('id', task.id)

      if (error) {
        toast.error('Error updating task: ' + error.message)
      } else {
        await fetchTasks()
      }
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
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

    // Ownership filter
    if (filterOwnership === 'my' && task.user_id !== userId) return false
    if (filterOwnership === 'team' && (task.user_id === userId || !task.is_team_task)) return false

    return true
  })

  // Tasks shown inside the Visit Checklist modal. Scoped only by the modal's
  // apiary picker and active-status; the page-level filters don't apply so the
  // checklist always reflects "what needs doing on this visit". Events and
  // reminders are excluded — only event_type='task' belongs in a hive-side
  // checkable list.
  const checklistTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.event_type !== 'task') return false
      if (task.completed) return false
      if (checklistApiaryId !== 'all' && task.apiary_id !== checklistApiaryId) return false
      return true
    })
  }, [tasks, checklistApiaryId])

  // Group checklist tasks for printable display: apiary -> hive -> tasks.
  // Tasks without a hive_id sit in a synthetic 'general' group at the end of
  // each apiary. Tasks without an apiary_id sit in a synthetic 'unassigned' apiary.
  const checklistGroups = useMemo(() => {
    type HiveGroup = { hiveId: string | null; hiveNumber: string; tasks: TaskEvent[] }
    type ApiaryGroup = { apiaryId: string | null; apiaryName: string; hives: HiveGroup[] }

    const apiaryById = new Map(apiaries.map(a => [a.id, a]))
    const hiveById = new Map(hives.map(h => [h.id, h]))
    const apiaryMap = new Map<string, ApiaryGroup>()

    for (const task of checklistTasks) {
      const apiaryKey = task.apiary_id ?? '__none__'
      const apiaryName = task.apiary_id
        ? apiaryById.get(task.apiary_id)?.name ?? 'Unknown apiary'
        : 'Unassigned'

      let apiaryGroup = apiaryMap.get(apiaryKey)
      if (!apiaryGroup) {
        apiaryGroup = { apiaryId: task.apiary_id, apiaryName, hives: [] }
        apiaryMap.set(apiaryKey, apiaryGroup)
      }

      const hiveKey = task.hive_id ?? '__general__'
      const hiveNumber = task.hive_id
        ? hiveById.get(task.hive_id)?.hive_number ?? 'Unknown hive'
        : 'General apiary tasks'

      let hiveGroup = apiaryGroup.hives.find(h => (h.hiveId ?? '__general__') === hiveKey)
      if (!hiveGroup) {
        hiveGroup = { hiveId: task.hive_id, hiveNumber, tasks: [] }
        apiaryGroup.hives.push(hiveGroup)
      }
      hiveGroup.tasks.push(task)
    }

    const sortedApiaries = Array.from(apiaryMap.values()).sort((a, b) => a.apiaryName.localeCompare(b.apiaryName))
    for (const apiaryGroup of sortedApiaries) {
      apiaryGroup.hives.sort((a, b) => {
        if (a.hiveId === null) return 1
        if (b.hiveId === null) return -1
        return a.hiveNumber.localeCompare(b.hiveNumber, undefined, { numeric: true })
      })
      for (const hiveGroup of apiaryGroup.hives) {
        hiveGroup.tasks.sort((a, b) => a.start_date.localeCompare(b.start_date))
      }
    }
    return sortedApiaries
  }, [checklistTasks, apiaries, hives])

  const openChecklist = useCallback(() => {
    setChecklistApiaryId(filterApiary !== 'all' ? filterApiary : 'all')
    setShowChecklist(true)
  }, [filterApiary])

  useEffect(() => {
    if (!highlightedTaskId || scrolledTaskRef.current === highlightedTaskId) return
    if (!filteredTasks.some(task => task.id === highlightedTaskId)) return

    scrolledTaskRef.current = highlightedTaskId

    requestAnimationFrame(() => {
      document.getElementById(`task-card-${highlightedTaskId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }, [filteredTasks, highlightedTaskId])

  // Helper functions
  const formatDate = (dateString: string) => {
    return formatLocalDate(dateString)
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5)
  }

  const getPriorityBadgeTone = (priority: string): 'red' | 'amber' | 'blue' | 'neutral' => {
    switch (priority) {
      case 'urgent': return 'red'
      case 'high': return 'amber'
      case 'normal': return 'blue'
      case 'low': return 'neutral'
      default: return 'neutral'
    }
  }

  const getTaskCardAccentClass = (task: TaskEvent) => {
    if (task.completed) return 'fj-border-accent-green opacity-60'
    if (task.is_team_task) return 'fj-border-accent-purple'
    return 'fj-border-accent-blue'
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

  // Unique equipment items aggregated across all tasks in the checklist scope.
  const getEquipmentList = () => {
    const equipmentSet = new Set<string>()
    checklistTasks.forEach(task => {
      if (task.equipment_needed) {
        task.equipment_needed.split(/[,\n]/).forEach(item => {
          const trimmed = item.trim()
          if (trimmed) equipmentSet.add(trimmed)
        })
      }
    })
    return Array.from(equipmentSet).sort()
  }

  // Title shown in the checklist modal header.
  const getChecklistScopeName = () => {
    if (checklistApiaryId === 'all') return 'All apiaries'
    const apiary = apiaries.find(a => a.id === checklistApiaryId)
    return apiary?.name || 'Unknown apiary'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-responsive-3xl font-bold text-foreground">Tasks & Events 📅</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openChecklist}
            tone="neutral"
          >
            <ClipboardList size={18} />
            <span className="hidden sm:inline">Visit Checklist</span>
            <span className="sm:hidden">Checklist</span>
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            tone="success"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Task/Event</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-text-tertiary" />
          <h2 className="font-semibold text-foreground">Filters</h2>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isTeamMember ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4`}>
          <div>
            <FieldLabel>Type</FieldLabel>
            <SelectField
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="event">Events</option>
              <option value="reminder">Reminders</option>
            </SelectField>
          </div>

          <div>
            <FieldLabel>Category</FieldLabel>
            <SelectField
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
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
            </SelectField>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <SelectField
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </SelectField>
          </div>

          {isTeamMember && (
            <div>
              <FieldLabel>Ownership</FieldLabel>
              <SelectField
                value={filterOwnership}
                onChange={(e) => setFilterOwnership(e.target.value as 'all' | 'my' | 'team')}
              >
                <option value="all">All Tasks</option>
                <option value="my">My Tasks</option>
                <option value="team">Team Tasks</option>
              </SelectField>
            </div>
          )}

          <div>
            <FieldLabel>Hive</FieldLabel>
            <SelectField
              value={filterHive}
              onChange={(e) => setFilterHive(e.target.value)}
            >
              <option value="all">All Hives</option>
              {hives.map(hive => (
                <option key={hive.id} value={hive.id}>Hive {hive.hive_number}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <FieldLabel>Apiary</FieldLabel>
            <SelectField
              value={filterApiary}
              onChange={(e) => setFilterApiary(e.target.value)}
            >
              <option value="all">All Apiaries</option>
              {apiaries.map(apiary => (
                <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
              ))}
            </SelectField>
          </div>
        </div>

      </Card>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Calendar size={48} className="mx-auto text-text-tertiary mb-4" />
          <p className="text-text-tertiary mb-2">No tasks or events found</p>
          <p className="text-sm text-text-tertiary">Create your first task or event to get started</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              id={`task-card-${task.id}`}
              className={`scroll-mt-24 rounded-lg transition-shadow ${
                task.id === highlightedTaskId ? 'ring-2 ring-blue-500/60 ring-offset-2 ring-offset-background shadow-lg' : ''
              }`}
            >
              <Card
                padding="sm"
                className={`border-l-4 ${getTaskCardAccentClass(task)}`}
              >
                <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Completion checkbox */}
                  <IconButton
                    onClick={() => toggleComplete(task)}
                    className="mt-1 flex-shrink-0"
                    disabled={togglingIds.has(task.id)}
                    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.completed ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Circle size={20} className="text-text-tertiary hover:text-text-tertiary" />
                    )}
                  </IconButton>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <h3 className={`font-semibold text-foreground ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      <Badge tone={getPriorityBadgeTone(task.priority)} className="uppercase">
                        {task.priority}
                      </Badge>
                      <Badge tone="neutral">{getTypeLabel(task.event_type)}</Badge>
                      {task.category && (
                        <Badge tone="green">
                          {getCategoryLabel(task.category)}
                        </Badge>
                      )}
                      {task.reminder_enabled && (
                        <Badge tone="amber">
                          📧 Email Reminder
                        </Badge>
                      )}
                      {task.is_team_task && (
                        <Badge tone="purple">
                          Team Task
                        </Badge>
                      )}
                      {task.user_id !== userId && (
                        <Badge tone="blue">
                          Created by {task.creator_name || task.creator_email || 'team member'}
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-text-tertiary mb-2">{task.description}</p>
                    )}

                    {task.equipment_needed && (
                      <div className="fj-text-warning text-sm mb-2 flex items-start gap-1">
                        <span className="font-medium">Equipment:</span>
                        <span>{task.equipment_needed}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
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
                      <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary flex-wrap">
                        {task.hive_id && (
                          <Chip size="xs" tone="neutral">
                            Hive: {hives.find(h => h.id === task.hive_id)?.hive_number || 'Unknown'}
                          </Chip>
                        )}
                        {task.apiary_id && (
                          <Chip size="xs" tone="neutral">
                            Apiary: {apiaries.find(a => a.id === task.apiary_id)?.name || 'Unknown'}
                          </Chip>
                        )}
                        {task.batch_id && (
                          <Chip size="xs" tone="neutral">
                            Batch: {batches.find(b => b.id === task.batch_id)?.batch_name || 'Unknown'}
                          </Chip>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <IconButton
                    onClick={() => handleEdit(task)}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(task.id)}
                    tone="danger"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ModalShell
          title={editingTask ? 'Edit Task/Event' : 'Create Task/Event'}
          titleClassName="text-xl"
          maxWidthClassName="max-w-2xl"
          shellClassName="max-h-[90vh] overflow-y-auto"
          headerClassName="sticky top-0 bg-surface-elevated dark:bg-surface-elevated z-10"
          bodyClassName="p-0"
          onClose={resetForm}
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <FieldLabel required>Title</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextAreaField
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Type, Category, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>Type</FieldLabel>
                  <SelectField
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'task' | 'event' | 'reminder' })}
                    required
                  >
                    <option value="task">Task</option>
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Category</FieldLabel>
                  <SelectField
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectField
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </SelectField>
                </div>
              </div>

              {/* Start Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Start Date</FieldLabel>
                  <TextInput
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <FieldLabel>Start Time</FieldLabel>
                  <TextInput
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              {/* End Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>End Date</FieldLabel>
                  <TextInput
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <FieldLabel>End Time</FieldLabel>
                  <TextInput
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    disabled={formData.all_day}
                  />
                </div>
              </div>

              {/* All Day */}
              <div className="flex items-center gap-2">
                <CheckboxInput
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                />
                <label htmlFor="all_day" className="text-sm font-medium text-text-secondary">
                  All day event
                </label>
              </div>

              {/* Associations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Hive</FieldLabel>
                  <SelectField
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
                  >
                    <option value="">None</option>
                    {(() => {
                      const matchesApiary = (h: Hive) => !formData.apiary_id || h.apiary_id === formData.apiary_id
                      const myHives = hives.filter(h => !h.is_shared && matchesApiary(h))
                      const sharedHives = hives.filter(h => h.is_shared && matchesApiary(h))
                      return (
                        <>
                          {myHives.length > 0 && (
                            <optgroup label="My Hives">
                              {myHives.map(hive => (
                                <option key={hive.id} value={hive.id}>Hive {hive.hive_number}</option>
                              ))}
                            </optgroup>
                          )}
                          {sharedHives.length > 0 && (
                            <optgroup label="Shared Hives">
                              {sharedHives.map(hive => (
                                <option key={hive.id} value={hive.id}>Hive {hive.hive_number} (Shared)</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      )
                    })()}
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Apiary</FieldLabel>
                  <SelectField
                    value={formData.apiary_id}
                    onChange={(e) => {
                      const newApiaryId = e.target.value
                      const currentHive = hives.find(h => h.id === formData.hive_id)
                      setFormData({
                        ...formData,
                        apiary_id: newApiaryId,
                        hive_id: currentHive?.apiary_id === newApiaryId || !newApiaryId ? formData.hive_id : '',
                      })
                    }}
                  >
                    <option value="">None</option>
                    {apiaries.filter(a => !a.is_shared).length > 0 && (
                      <optgroup label="My Apiaries">
                        {apiaries.filter(a => !a.is_shared).map(apiary => (
                          <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {apiaries.filter(a => a.is_shared).length > 0 && (
                      <optgroup label="Shared Apiaries">
                        {apiaries.filter(a => a.is_shared).map(apiary => (
                          <option key={apiary.id} value={apiary.id}>{apiary.name} (Shared)</option>
                        ))}
                      </optgroup>
                    )}
                  </SelectField>
                </div>
              </div>

              {/* Reminder */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckboxInput
                    id="reminder_enabled"
                    checked={formData.reminder_enabled}
                    onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                  />
                  <label htmlFor="reminder_enabled" className="text-sm font-semibold text-foreground">
                    Enable reminder <span className="fj-text-warning">(required for email notifications)</span>
                  </label>
                </div>
                {formData.reminder_enabled && (
                  <div>
                    <FieldLabel>Remind me (minutes before)</FieldLabel>
                    <TextInput
                      type="number"
                      value={formData.reminder_minutes_before}
                      onChange={(e) => { const val = parseInt(e.target.value); setFormData({ ...formData, reminder_minutes_before: Number.isNaN(val) ? 60 : val }) }}
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notes</FieldLabel>
                <TextAreaField
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Equipment/Parts Needed */}
              <div>
                <FieldLabel>Equipment/Parts Needed</FieldLabel>
                <TextAreaField
                  value={formData.equipment_needed}
                  onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                  rows={2}
                  placeholder="e.g., New frames, queen excluder, smoker fuel..."
                />
              </div>

              {/* Actions */}
              <FormActionRow className="pt-4">
                <Button type="submit" tone="success" fullWidth>
                  {editingTask ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  tone="neutral"
                >
                  Cancel
                </Button>
              </FormActionRow>
            </form>
        </ModalShell>
      )}

      {/* Visit Checklist Modal */}
      {showChecklist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-background print:p-0">
          <Card
            padding="none"
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none"
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface-elevated dark:bg-surface-elevated border-b border-border px-6 py-4 flex items-center justify-between print:static print:bg-background print:border-b-2 print:border-black">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Visit Checklist</h2>
                <p className="text-sm text-text-secondary">
                  {getChecklistScopeName()} — {new Date().toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <IconButton
                onClick={() => setShowChecklist(false)}
                size="sm"
                className="print:hidden"
              >
                <X size={24} />
              </IconButton>
            </div>

            <div className="p-6 space-y-6">
              {/* Apiary picker (hidden when printing) */}
              <div className="print:hidden">
                <FieldLabel htmlFor="checklist-apiary">Apiary</FieldLabel>
                <SelectField
                  id="checklist-apiary"
                  value={checklistApiaryId}
                  onChange={(e) => setChecklistApiaryId(e.target.value)}
                >
                  <option value="all">All apiaries</option>
                  {apiaries.map(apiary => (
                    <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                  ))}
                </SelectField>
              </div>

              {/* Equipment Section */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>📦</span> Equipment to bring
                </h3>
                {getEquipmentList().length > 0 ? (
                  <Surface tone="amber" padded="sm">
                    <ul className="space-y-2">
                      {getEquipmentList().map((item, index) => (
                        <li key={index} className="flex items-center gap-3 text-foreground">
                          <CheckboxInput className="print:border-black" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Surface>
                ) : (
                  <p className="text-text-tertiary italic">No equipment specified for these tasks</p>
                )}
              </div>

              {/* Tasks grouped by apiary -> hive */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>✅</span> Tasks to complete
                </h3>
                {checklistGroups.length > 0 ? (
                  <div className="space-y-4">
                    {checklistGroups.map(apiaryGroup => (
                      <div key={apiaryGroup.apiaryId ?? '__none__'} className="space-y-3">
                        {checklistApiaryId === 'all' && (
                          <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                            {apiaryGroup.apiaryName}
                          </h4>
                        )}
                        {apiaryGroup.hives.map(hiveGroup => (
                          <Surface
                            key={hiveGroup.hiveId ?? '__general__'}
                            padded="sm"
                            className="bg-surface-secondary"
                          >
                            <p className="text-sm font-semibold text-foreground mb-2">
                              {hiveGroup.hiveId ? `Hive ${hiveGroup.hiveNumber}` : 'General apiary tasks'}
                            </p>
                            <ul className="space-y-3">
                              {hiveGroup.tasks.map(task => (
                                <li key={task.id} className="flex items-start gap-3">
                                  <CheckboxInput
                                    defaultChecked={task.completed}
                                    className="mt-1 print:border-black"
                                  />
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                      <span className={`text-foreground ${task.completed ? 'line-through text-text-tertiary' : ''}`}>
                                        {task.title}
                                      </span>
                                      <span className="text-xs text-text-tertiary">
                                        {formatLocalDate(task.start_date)}
                                      </span>
                                      {task.priority && task.priority !== 'normal' && (
                                        <Badge tone={getPriorityBadgeTone(task.priority)} className="uppercase">
                                          {task.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-text-tertiary mt-1">{task.description}</p>
                                    )}
                                    {task.equipment_needed && (
                                      <p className="text-xs text-text-tertiary mt-1">
                                        Equipment: {task.equipment_needed}
                                      </p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </Surface>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-tertiary italic">No outstanding tasks for this scope</p>
                )}
              </div>

              {/* Notes Section */}
              <div className="print:block">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>📝</span> Notes
                </h3>
                <Surface padded="sm" className="bg-surface-secondary min-h-[80px] print:min-h-[150px] print:border-dashed">
                  <p className="text-text-tertiary text-sm print:hidden">Space for field notes...</p>
                </Surface>
              </div>
            </div>

            {/* Actions */}
            <FormActionRow bordered padding="md" className="sticky bottom-0 bg-surface-elevated dark:bg-surface-elevated print:hidden">
              <Button
                onClick={() => window.print()}
                tone="success"
                fullWidth
              >
                <Printer size={18} />
                Print Checklist
              </Button>
              <Button
                onClick={() => setShowChecklist(false)}
                tone="neutral"
              >
                Close
              </Button>
            </FormActionRow>
          </Card>
        </div>
      )}
    </div>
  )
}

import { z } from 'zod'
import { Tool } from './index'
import { getSupabase, findHiveByName, formatDate, daysUntil, daysSince } from './utils'

// Helper to extract hive info from Supabase join
function getHiveInfo(hives: unknown): { hive_number: string; apiary_name: string } {
  if (!hives) return { hive_number: 'N/A', apiary_name: 'N/A' }
  const h = hives as { hive_number?: string; apiaries?: unknown }
  const apiaries = h.apiaries
  let apiaryName = 'N/A'
  if (apiaries && typeof apiaries === 'object' && 'name' in (apiaries as Record<string, unknown>)) {
    apiaryName = (apiaries as { name: string }).name
  }
  return {
    hive_number: h.hive_number || 'N/A',
    apiary_name: apiaryName
  }
}

// Get upcoming tasks
export const getUpcomingTasks: Tool = {
  name: 'getUpcomingTasks',
  description: 'Get tasks due in the next specified number of days',
  parameters: z.object({
    days: z.number().optional().describe('Look ahead period in days (default 7)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { days?: number }
    const supabase = getSupabase()
    const lookAhead = args.days || 7

    const today = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + lookAhead)

    const { data, error } = await supabase
      .from('tasks_events')
      .select('title, description, due_date, priority, status, task_type, hives(hive_number, apiaries(name))')
      .eq('user_id', userId)
      .neq('status', 'Completed')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', cutoff.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (error) return `Error fetching tasks: ${error.message}`
    if (!data?.length) return `No tasks due in the next ${lookAhead} days.`

    return {
      lookAheadDays: lookAhead,
      count: data.length,
      tasks: data.map(t => {
        const hiveInfo = getHiveInfo(t.hives)
        return {
          title: t.title,
          description: t.description?.substring(0, 100) || 'None',
          dueDate: formatDate(t.due_date),
          daysUntil: daysUntil(t.due_date),
          priority: t.priority || 'Normal',
          status: t.status || 'Pending',
          type: t.task_type || 'General',
          hive: hiveInfo.hive_number,
          apiary: hiveInfo.apiary_name
        }
      })
    }
  }
}

// Get overdue tasks
export const getOverdueTasks: Tool = {
  name: 'getOverdueTasks',
  description: 'Get incomplete tasks that are past their due date',
  parameters: z.object({}),
  execute: async (_args: unknown, userId: string) => {
    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('tasks_events')
      .select('title, description, due_date, priority, status, task_type, hives(hive_number, apiaries(name))')
      .eq('user_id', userId)
      .neq('status', 'Completed')
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (error) return `Error fetching tasks: ${error.message}`
    if (!data?.length) return 'No overdue tasks.'

    return {
      count: data.length,
      tasks: data.map(t => {
        const hiveInfo = getHiveInfo(t.hives)
        return {
          title: t.title,
          description: t.description?.substring(0, 100) || 'None',
          dueDate: formatDate(t.due_date),
          daysOverdue: daysSince(t.due_date),
          priority: t.priority || 'Normal',
          status: t.status || 'Pending',
          type: t.task_type || 'General',
          hive: hiveInfo.hive_number,
          apiary: hiveInfo.apiary_name
        }
      })
    }
  }
}

// Get tasks for a specific hive
export const getTasksForHive: Tool = {
  name: 'getTasksForHive',
  description: 'Get all tasks associated with a specific hive',
  parameters: z.object({
    hiveName: z.string().describe('Name or number of the hive'),
    includeCompleted: z.boolean().optional().describe('Include completed tasks (default false)')
  }),
  execute: async (rawArgs: unknown, userId: string) => {
    const args = rawArgs as { hiveName: string; includeCompleted?: boolean }
    const supabase = getSupabase()
    const hive = await findHiveByName(userId, args.hiveName)

    if (!hive) {
      return `Hive "${args.hiveName}" not found.`
    }

    let query = supabase
      .from('tasks_events')
      .select('title, description, due_date, priority, status, task_type, created_at')
      .eq('hive_id', hive.id)
      .order('due_date', { ascending: true })

    if (!args.includeCompleted) {
      query = query.neq('status', 'Completed')
    }

    const { data, error } = await query

    if (error) return `Error fetching tasks: ${error.message}`
    if (!data?.length) return `No tasks found for hive "${hive.hive_number}".`

    const pending = data.filter(t => t.status !== 'Completed')
    const completed = data.filter(t => t.status === 'Completed')

    return {
      hive: hive.hive_number,
      apiary: hive.apiary_name,
      pendingCount: pending.length,
      completedCount: completed.length,
      tasks: data.map(t => ({
        title: t.title,
        description: t.description?.substring(0, 100) || 'None',
        dueDate: t.due_date ? formatDate(t.due_date) : 'No due date',
        priority: t.priority || 'Normal',
        status: t.status || 'Pending',
        type: t.task_type || 'General'
      }))
    }
  }
}

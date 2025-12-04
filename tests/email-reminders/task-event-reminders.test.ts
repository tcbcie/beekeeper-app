/**
 * Test Suite: Task and Event Email Reminders
 *
 * Tests the complete email reminder functionality including:
 * - User preference management
 * - Reminder calculation logic
 * - Email generation
 * - Database updates
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Test user IDs
let testUserId: string
let testTaskId: string
let testEventId: string

describe('Email Reminder System - User Preferences', () => {
  beforeEach(async () => {
    // Create test user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        email: 'test.reminders@example.com',
        first_name: 'Test',
        last_name: 'User',
        enable_task_email_reminders: true,
        enable_event_email_reminders: true,
        task_reminder_frequency: 'daily',
      })
      .select()
      .single()

    if (error) throw error
    testUserId = profile.id
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.from('profiles').delete().eq('id', testUserId)
    }
  })

  it('should have default email reminder preferences enabled', async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('enable_task_email_reminders, enable_event_email_reminders, task_reminder_frequency')
      .eq('id', testUserId)
      .single()

    expect(profile?.enable_task_email_reminders).toBe(true)
    expect(profile?.enable_event_email_reminders).toBe(true)
    expect(profile?.task_reminder_frequency).toBe('daily')
  })

  it('should allow updating task reminder preferences', async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ enable_task_email_reminders: false })
      .eq('id', testUserId)

    expect(error).toBeNull()

    const { data: profile } = await supabase
      .from('profiles')
      .select('enable_task_email_reminders')
      .eq('id', testUserId)
      .single()

    expect(profile?.enable_task_email_reminders).toBe(false)
  })

  it('should allow updating event reminder preferences', async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ enable_event_email_reminders: false })
      .eq('id', testUserId)

    expect(error).toBeNull()

    const { data: profile } = await supabase
      .from('profiles')
      .select('enable_event_email_reminders')
      .eq('id', testUserId)
      .single()

    expect(profile?.enable_event_email_reminders).toBe(false)
  })

  it('should allow updating reminder frequency', async () => {
    const frequencies = ['realtime', 'daily', 'weekly', 'disabled'] as const

    for (const frequency of frequencies) {
      const { error } = await supabase
        .from('profiles')
        .update({ task_reminder_frequency: frequency })
        .eq('id', testUserId)

      expect(error).toBeNull()

      const { data: profile } = await supabase
        .from('profiles')
        .select('task_reminder_frequency')
        .eq('id', testUserId)
        .single()

      expect(profile?.task_reminder_frequency).toBe(frequency)
    }
  })

  it('should reject invalid reminder frequency', async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ task_reminder_frequency: 'invalid' as any })
      .eq('id', testUserId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('violates check constraint')
  })
})

describe('Email Reminder System - Task Creation', () => {
  beforeEach(async () => {
    // Create test user
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        email: 'test.tasks@example.com',
        first_name: 'Task',
        last_name: 'Tester',
        enable_task_email_reminders: true,
        task_reminder_frequency: 'daily',
      })
      .select()
      .single()

    testUserId = profile.id
  })

  afterEach(async () => {
    // Clean up
    if (testTaskId) {
      await supabase.from('tasks_events').delete().eq('id', testTaskId)
    }
    if (testUserId) {
      await supabase.from('profiles').delete().eq('id', testUserId)
    }
  })

  it('should create task with reminder enabled', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: task, error } = await supabase
      .from('tasks_events')
      .insert({
        user_id: testUserId,
        title: 'Test Hive Inspection',
        description: 'Check for queen cells',
        event_type: 'task',
        category: 'inspection',
        priority: 'high',
        start_date: tomorrow.toISOString().split('T')[0],
        start_time: '09:00:00',
        reminder_enabled: true,
        reminder_minutes_before: 120,
        completed: false,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(task?.reminder_enabled).toBe(true)
    expect(task?.reminder_sent).toBe(false)
    expect(task?.reminder_minutes_before).toBe(120)
    testTaskId = task.id
  })

  it('should default reminder_sent to false', async () => {
    const { data: task } = await supabase
      .from('tasks_events')
      .insert({
        user_id: testUserId,
        title: 'Test Task',
        event_type: 'task',
        category: 'general',
        priority: 'normal',
        start_date: new Date().toISOString().split('T')[0],
        reminder_enabled: true,
      })
      .select()
      .single()

    expect(task?.reminder_sent).toBe(false)
    testTaskId = task.id
  })

  it('should default reminder_minutes_before to 60', async () => {
    const { data: task } = await supabase
      .from('tasks_events')
      .insert({
        user_id: testUserId,
        title: 'Test Task',
        event_type: 'task',
        category: 'general',
        priority: 'normal',
        start_date: new Date().toISOString().split('T')[0],
        reminder_enabled: true,
      })
      .select()
      .single()

    expect(task?.reminder_minutes_before).toBe(60)
    testTaskId = task.id
  })
})

describe('Email Reminder System - Reminder Logic', () => {
  beforeEach(async () => {
    // Create test user
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        email: 'test.logic@example.com',
        first_name: 'Logic',
        last_name: 'Tester',
        enable_task_email_reminders: true,
        task_reminder_frequency: 'realtime',
      })
      .select()
      .single()

    testUserId = profile.id
  })

  afterEach(async () => {
    // Clean up
    await supabase.from('tasks_events').delete().eq('user_id', testUserId)
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  it('should find tasks within reminder window (2 hours)', async () => {
    const inTwoHours = new Date()
    inTwoHours.setHours(inTwoHours.getHours() + 2)

    const { data: task } = await supabase
      .from('tasks_events')
      .insert({
        user_id: testUserId,
        title: 'Upcoming Task',
        event_type: 'task',
        category: 'inspection',
        priority: 'high',
        start_date: inTwoHours.toISOString().split('T')[0],
        start_time: `${inTwoHours.getHours().toString().padStart(2, '0')}:00:00`,
        reminder_enabled: true,
        reminder_minutes_before: 120, // 2 hours
        reminder_sent: false,
        completed: false,
      })
      .select()
      .single()

    testTaskId = task.id

    // Query tasks that should trigger reminders
    const now = new Date()
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)
      .eq('completed', false)
      .gte('start_date', now.toISOString().split('T')[0])
      .lte('start_date', endDate.toISOString().split('T')[0])

    expect(tasks).toHaveLength(1)
    expect(tasks?.[0].id).toBe(testTaskId)
  })

  it('should not find completed tasks', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await supabase.from('tasks_events').insert({
      user_id: testUserId,
      title: 'Completed Task',
      event_type: 'task',
      category: 'general',
      priority: 'normal',
      start_date: tomorrow.toISOString().split('T')[0],
      reminder_enabled: true,
      reminder_sent: false,
      completed: true,
    })

    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)
      .eq('completed', false)

    expect(tasks).toHaveLength(0)
  })

  it('should not find tasks with reminders already sent', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await supabase.from('tasks_events').insert({
      user_id: testUserId,
      title: 'Already Reminded Task',
      event_type: 'task',
      category: 'general',
      priority: 'normal',
      start_date: tomorrow.toISOString().split('T')[0],
      reminder_enabled: true,
      reminder_sent: true,
      completed: false,
    })

    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)

    expect(tasks).toHaveLength(0)
  })

  it('should not find tasks with reminders disabled', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await supabase.from('tasks_events').insert({
      user_id: testUserId,
      title: 'No Reminder Task',
      event_type: 'task',
      category: 'general',
      priority: 'normal',
      start_date: tomorrow.toISOString().split('T')[0],
      reminder_enabled: false,
      reminder_sent: false,
      completed: false,
    })

    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reminder_enabled', true)

    expect(tasks).toHaveLength(0)
  })
})

describe('Email Reminder System - Frequency Filters', () => {
  beforeEach(async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        email: 'test.frequency@example.com',
        first_name: 'Frequency',
        last_name: 'Tester',
        enable_task_email_reminders: true,
        task_reminder_frequency: 'daily',
      })
      .select()
      .single()

    testUserId = profile.id
  })

  afterEach(async () => {
    await supabase.from('tasks_events').delete().eq('user_id', testUserId)
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  it('should query users with realtime frequency', async () => {
    await supabase
      .from('profiles')
      .update({ task_reminder_frequency: 'realtime' })
      .eq('id', testUserId)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or('enable_task_email_reminders.eq.true,enable_event_email_reminders.eq.true')
      .neq('task_reminder_frequency', 'disabled')

    expect(profiles).toContainEqual(
      expect.objectContaining({
        id: testUserId,
        task_reminder_frequency: 'realtime',
      })
    )
  })

  it('should query users with daily frequency', async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or('enable_task_email_reminders.eq.true,enable_event_email_reminders.eq.true')
      .neq('task_reminder_frequency', 'disabled')

    expect(profiles).toContainEqual(
      expect.objectContaining({
        id: testUserId,
        task_reminder_frequency: 'daily',
      })
    )
  })

  it('should exclude users with disabled frequency', async () => {
    await supabase
      .from('profiles')
      .update({ task_reminder_frequency: 'disabled' })
      .eq('id', testUserId)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or('enable_task_email_reminders.eq.true,enable_event_email_reminders.eq.true')
      .neq('task_reminder_frequency', 'disabled')

    expect(profiles).not.toContainEqual(
      expect.objectContaining({ id: testUserId })
    )
  })

  it('should exclude users with all reminders disabled', async () => {
    await supabase
      .from('profiles')
      .update({
        enable_task_email_reminders: false,
        enable_event_email_reminders: false,
      })
      .eq('id', testUserId)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or('enable_task_email_reminders.eq.true,enable_event_email_reminders.eq.true')

    expect(profiles).not.toContainEqual(
      expect.objectContaining({ id: testUserId })
    )
  })
})

describe('Email Reminder System - Marking Reminders as Sent', () => {
  beforeEach(async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        email: 'test.marking@example.com',
        first_name: 'Marking',
        last_name: 'Tester',
        enable_task_email_reminders: true,
      })
      .select()
      .single()

    testUserId = profile.id

    const { data: task } = await supabase
      .from('tasks_events')
      .insert({
        user_id: testUserId,
        title: 'Test Task',
        event_type: 'task',
        category: 'general',
        priority: 'normal',
        start_date: new Date().toISOString().split('T')[0],
        reminder_enabled: true,
        reminder_sent: false,
      })
      .select()
      .single()

    testTaskId = task.id
  })

  afterEach(async () => {
    await supabase.from('tasks_events').delete().eq('id', testTaskId)
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  it('should mark reminder as sent after sending email', async () => {
    const { error } = await supabase
      .from('tasks_events')
      .update({ reminder_sent: true })
      .eq('id', testTaskId)

    expect(error).toBeNull()

    const { data: task } = await supabase
      .from('tasks_events')
      .select('reminder_sent')
      .eq('id', testTaskId)
      .single()

    expect(task?.reminder_sent).toBe(true)
  })

  it('should not resend reminders for marked tasks', async () => {
    await supabase
      .from('tasks_events')
      .update({ reminder_sent: true })
      .eq('id', testTaskId)

    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)

    expect(tasks).toHaveLength(0)
  })

  it('should allow bulk update of multiple reminders', async () => {
    // Create multiple tasks
    const taskIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const { data: task } = await supabase
        .from('tasks_events')
        .insert({
          user_id: testUserId,
          title: `Test Task ${i}`,
          event_type: 'task',
          category: 'general',
          priority: 'normal',
          start_date: new Date().toISOString().split('T')[0],
          reminder_enabled: true,
          reminder_sent: false,
        })
        .select()
        .single()

      taskIds.push(task.id)
    }

    // Mark all as sent
    const { error } = await supabase
      .from('tasks_events')
      .update({ reminder_sent: true })
      .in('id', taskIds)

    expect(error).toBeNull()

    // Verify all marked
    const { data: tasks } = await supabase
      .from('tasks_events')
      .select('reminder_sent')
      .in('id', taskIds)

    expect(tasks).toHaveLength(3)
    expect(tasks?.every(t => t.reminder_sent === true)).toBe(true)

    // Cleanup
    await supabase.from('tasks_events').delete().in('id', taskIds)
  })
})

describe('Email Reminder System - Edge Function Integration', () => {
  it('should call Edge Function successfully', async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/task-event-reminders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data).toHaveProperty('success')
  })

  it('should return proper response format', async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/task-event-reminders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    expect(data).toHaveProperty('emailsSent')
    expect(data).toHaveProperty('emails')
  })
})

describe('Email Reminder System - Cron Job Verification', () => {
  it('should have task-event-reminders cron job scheduled', async () => {
    const { data: jobs } = await supabase.rpc('cron.job', {})
      .select('*')
      .eq('jobname', 'task-event-reminders-hourly')

    expect(jobs).toHaveLength(1)
    expect(jobs?.[0].active).toBe(true)
    expect(jobs?.[0].schedule).toBe('0 * * * *')
  })

  it('should have correct cron job configuration', async () => {
    const { data: jobs } = await supabase
      .from('cron.job')
      .select('jobname, schedule, active, command')
      .eq('jobname', 'task-event-reminders-hourly')

    expect(jobs?.[0].command).toContain('task-event-reminders')
    expect(jobs?.[0].command).toContain('http_post')
  })
})

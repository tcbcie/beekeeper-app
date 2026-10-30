'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { clearMonthlyTasksCache } from '@/components/dashboard/SeasonalReminders'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import { useToast } from '@/components/ui/Toast'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { supabase } from '@/lib/supabase'

interface MonthlyTask {
  id: string
  month: number
  position: number
  task: string
}

const MAX_TASKS = 5
const MAX_LENGTH = 300
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2026, i, 1).toLocaleDateString('en-IE', { month: 'long' }),
}))

// Supabase errors are plain objects. 23505 means another admin changed the same month's list.
function writeErrorMessage(error: { code?: string; message?: string }): string {
  return error.code === '23505'
    ? 'This list was changed elsewhere. It has been reloaded, so please try again.'
    : error.message || 'Could not save. Please try again.'
}

/** Admins edit the dashboard's "{Month} in Ireland" list, up to five items a month. */
export default function MonthlyTasksManagement() {
  const toast = useToast()
  const confirm = useConfirm()
  const { submitting, run } = useSubmitLock()
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [tasks, setTasks] = useState<MonthlyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [newText, setNewText] = useState('')
  // Only the latest load may update the list, so a slow answer cannot show the wrong month
  const loadSeqRef = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current
    const { data, error } = await supabase
      .from('monthly_apiary_tasks')
      .select('id, month, position, task')
      .eq('month', month)
      .order('position')
    if (seq !== loadSeqRef.current) return
    setLoadFailed(Boolean(error))
    if (!error) setTasks((data ?? []) as MonthlyTask[])
    setLoading(false)
  }, [month])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Every write ends here: the dashboard's kept copy goes, and the list shows what was saved
  const afterWrite = async (error: { code?: string; message?: string } | null, savedMessage: string) => {
    if (error) toast.error(writeErrorMessage(error))
    else {
      clearMonthlyTasksCache(month)
      toast.success(savedMessage)
    }
    await load()
    return !error
  }

  const addTask = () => run(async () => {
    const text = newText.trim()
    if (!text) return
    const used = new Set(tasks.map(t => t.position))
    const position = [1, 2, 3, 4, 5].find(p => !used.has(p))
    if (!position) return
    const { error } = await supabase.from('monthly_apiary_tasks').insert({ month, position, task: text })
    if (await afterWrite(error, 'Item added')) setNewText('')
  })

  const saveEdit = (id: string) => run(async () => {
    const text = editText.trim()
    if (!text) return
    // RLS blocks a non-admin with no error, only no rows
    const { data, error } = await supabase.from('monthly_apiary_tasks').update({ task: text }).eq('id', id).select('id')
    const blocked = !error && (!data || data.length === 0)
    if (await afterWrite(blocked ? { message: 'This item could not be saved.' } : error, 'Item saved')) setEditingId(null)
  })

  // One statement, so the two positions change together
  const move = (index: number, by: -1 | 1) => run(async () => {
    const a = tasks[index]
    const b = tasks[index + by]
    if (!a || !b) return
    const { error } = await supabase.from('monthly_apiary_tasks').upsert([
      { id: a.id, month: a.month, task: a.task, position: b.position },
      { id: b.id, month: b.month, task: b.task, position: a.position },
    ])
    await afterWrite(error, 'Order saved')
  })

  const remove = async (task: MonthlyTask) => {
    const confirmed = await confirm({
      title: 'Delete item',
      message: `Delete "${task.task}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return
    await run(async () => {
      const { data, error } = await supabase.from('monthly_apiary_tasks').delete().eq('id', task.id).select('id')
      const blocked = !error && (!data || data.length === 0)
      // A deletion leaves no row to carry the date, so the rest of the month's list records the change
      if (!error && !blocked) {
        await supabase.from('monthly_apiary_tasks').update({ updated_at: new Date().toISOString() }).eq('month', month)
      }
      await afterWrite(blocked ? { message: 'This item could not be deleted.' } : error, 'Item deleted')
    })
  }

  const hasUnsavedText = editingId !== null || newText.trim() !== ''

  return (
    <Card padding="md">
      <h2 className="text-xl font-semibold text-foreground">Monthly tasks</h2>
      <p className="mt-1 text-base text-text-secondary">
        Shown on everyone&apos;s dashboard under &ldquo;{MONTHS[month - 1].label} in Ireland&rdquo;, up to {MAX_TASKS} items a month. Changes appear the next time a user loads the app.
      </p>

      <div className="mt-4 max-w-xs">
        <SelectField
          label="Month"
          value={month}
          disabled={hasUnsavedText}
          helpText={hasUnsavedText ? 'Save or clear your text to change month.' : undefined}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </SelectField>
      </div>

      {loadFailed && (
        <div className="mt-4">
          <p className="text-base text-red-800 dark:text-red-300">This month&apos;s list could not be loaded.</p>
          <Button type="button" tone="neutral" size="sm" className="mt-2" onClick={load}>Try again</Button>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-base text-text-secondary">Loading…</p>
      ) : !loadFailed && (
        <>
          {tasks.length === 0 && <p className="mt-4 text-base text-text-secondary">No items for this month, so the panel will not show.</p>}
          <ol className="mt-4 divide-y divide-border">
            {tasks.map((task, index) => (
              <li key={task.id} className="py-3">
                {editingId === task.id ? (
                  <>
                    <TextAreaField
                      label={`Item ${index + 1}`}
                      value={editText}
                      rows={3}
                      maxLength={MAX_LENGTH}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" tone="success" size="sm" disabled={submitting || !editText.trim()} onClick={() => saveEdit(task.id)}>Save</Button>
                      <Button type="button" tone="neutral" size="sm" disabled={submitting} onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-base text-foreground break-words">{task.task}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" tone="neutral" size="sm" disabled={submitting || index === 0} aria-label={`Move up: ${task.task}`} onClick={() => move(index, -1)}>
                        <ChevronUp size={18} aria-hidden="true" />
                      </Button>
                      <Button type="button" tone="neutral" size="sm" disabled={submitting || index === tasks.length - 1} aria-label={`Move down: ${task.task}`} onClick={() => move(index, 1)}>
                        <ChevronDown size={18} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        tone="neutral"
                        size="sm"
                        disabled={submitting}
                        aria-label={`Edit: ${task.task}`}
                        onClick={() => { setEditingId(task.id); setEditText(task.task) }}
                      >
                        Edit
                      </Button>
                      <Button type="button" tone="danger" size="sm" disabled={submitting} aria-label={`Delete: ${task.task}`} onClick={() => remove(task)}>Delete</Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>

          {tasks.length < MAX_TASKS ? (
            <div className="mt-4">
              <TextAreaField
                label="New item"
                value={newText}
                rows={3}
                maxLength={MAX_LENGTH}
                onChange={e => setNewText(e.target.value)}
              />
              <Button type="button" tone="success" size="sm" className="mt-2" disabled={submitting || !newText.trim()} onClick={addTask}>Add item</Button>
            </div>
          ) : (
            <p className="mt-4 text-base text-text-secondary">This month has its {MAX_TASKS} items. Delete one to add another.</p>
          )}
        </>
      )}
    </Card>
  )
}

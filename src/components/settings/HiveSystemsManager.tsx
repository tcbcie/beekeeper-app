'use client'

import { useCallback, useEffect, useState } from 'react'
import { Boxes, Pencil, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import type { FrameStandardLabel, HiveSystem } from '@/types/hive-model'
import Button from '@/components/ui/Button'
import ModalShell from '@/components/ui/ModalShell'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import ToggleRow from '@/components/ui/ToggleRow'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface FormState {
  name: string
  brood_frame_standard_id: string
  super_frame_standard_id: string
  default_frames_full: string
  default_frames_nuc: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  brood_frame_standard_id: '',
  super_frame_standard_id: '',
  default_frames_full: '',
  default_frames_nuc: '',
  is_active: true,
}

/** Blank = no default; otherwise a whole number from 1 to 20. */
function parseFrames(value: string): number | null | 'invalid' {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 'invalid'
}

/**
 * Admin list of hive systems (National, Langstroth, ...) that users pick for their hive models.
 * Systems are retired rather than deleted, so models that use one keep showing its name.
 */
export default function HiveSystemsManager() {
  const toast = useToast()
  const { submitting, run } = useSubmitLock()
  const [systems, setSystems] = useState<HiveSystem[]>([])
  const [frames, setFrames] = useState<FrameStandardLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<HiveSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    const [systemsRes, framesRes] = await Promise.all([
      supabase.from('hive_systems').select('*').order('display_order'),
      supabase.from('frame_standards').select('id, label').order('display_order'),
    ])
    if (systemsRes.error || framesRes.error) {
      console.error('Failed to load hive systems:', systemsRes.error || framesRes.error)
      toast.error('Hive systems could not be loaded')
    } else {
      setSystems((systemsRes.data ?? []) as HiveSystem[])
      setFrames((framesRes.data ?? []) as FrameStandardLabel[])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const frameLabel = (id: string | null) => (id ? frames.find(f => f.id === id)?.label : undefined)

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (system: HiveSystem) => {
    setEditing(system)
    setForm({
      name: system.name,
      brood_frame_standard_id: system.brood_frame_standard_id ?? '',
      super_frame_standard_id: system.super_frame_standard_id ?? '',
      default_frames_full: system.default_frames_full ? String(system.default_frames_full) : '',
      default_frames_nuc: system.default_frames_nuc ? String(system.default_frames_nuc) : '',
      is_active: system.is_active,
    })
    setFormOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      const name = form.name.trim()
      const full = parseFrames(form.default_frames_full)
      const nuc = parseFrames(form.default_frames_nuc)
      if (!name) {
        toast.error('Please give the hive system a name')
        return
      }
      if (full === 'invalid' || nuc === 'invalid') {
        toast.error('Frames must be a whole number from 1 to 20')
        return
      }
      const row = {
        name,
        brood_frame_standard_id: form.brood_frame_standard_id || null,
        super_frame_standard_id: form.super_frame_standard_id || null,
        default_frames_full: full,
        default_frames_nuc: nuc,
        is_active: form.is_active,
      }
      const nextOrder = systems.length > 0 ? Math.max(...systems.map(s => s.display_order)) + 1 : 1
      const result = editing
        ? await supabase.from('hive_systems').update(row).eq('id', editing.id).select('id')
        : await supabase.from('hive_systems').insert({ ...row, display_order: nextOrder }).select('id')

      if (result.error || !result.data?.length) {
        console.error('Failed to save hive system:', result.error)
        toast.error(result.error?.code === '23505'
          ? 'A hive system with this name already exists'
          : 'The hive system could not be saved')
        return
      }
      toast.success(editing ? 'Hive system saved' : 'Hive system added')
      setFormOpen(false)
      setEditing(null)
      await load()
    })
  }

  if (loading) return <LoadingSpinner text="Loading hive systems..." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="text-forest-600 dark:text-emerald-500" size={24} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-foreground">Hive systems</h3>
        </div>
        <Button tone="success" size="sm" onClick={openNew}>
          <Plus size={16} aria-hidden="true" />
          Add system
        </Button>
      </div>
      <p className="text-sm text-text-secondary">
        Users pick one of these for each hive model. Retire a system instead of deleting it: models that
        already use it keep its name, but it is no longer offered.
      </p>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {systems.map((system) => (
          <li key={system.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                {system.name}
                {!system.is_active && <span className="ml-2 text-sm font-normal text-text-tertiary">(retired)</span>}
              </div>
              <div className="text-sm text-text-secondary">
                {[
                  frameLabel(system.brood_frame_standard_id) && `Brood: ${frameLabel(system.brood_frame_standard_id)}`,
                  frameLabel(system.super_frame_standard_id) && `Supers: ${frameLabel(system.super_frame_standard_id)}`,
                  system.default_frames_full && `${system.default_frames_full} frames`,
                  system.default_frames_nuc && `${system.default_frames_nuc} in a nuc`,
                ].filter(Boolean).join(' · ') || 'No frame details'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openEdit(system)}
              className="fj-icon-btn min-h-[48px] min-w-[48px]"
              aria-label={`Edit ${system.name}`}
            >
              <Pencil size={20} />
            </button>
          </li>
        ))}
      </ul>

      {formOpen && (
        <ModalShell
          title={editing ? `Edit ${editing.name}` : 'New hive system'}
          onClose={() => { if (!submitting) setFormOpen(false) }}
          closeDisabled={submitting}
          bodyClassName="p-4 md:p-6"
          footer={
            <div className="flex gap-3 border-t border-border p-4">
              <Button onClick={() => setFormOpen(false)} disabled={submitting} className="flex-1 min-h-[48px]">Cancel</Button>
              <Button type="submit" form="hive-system-form" tone="success" disabled={submitting} className="flex-1 min-h-[48px]">
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        >
          <form id="hive-system-form" onSubmit={handleSave} className="space-y-4">
            <TextInput
              label="Name"
              required
              maxLength={60}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <SelectField
              label="Brood frame"
              value={form.brood_frame_standard_id}
              onChange={(e) => setForm({ ...form, brood_frame_standard_id: e.target.value })}
            >
              <option value="">None</option>
              {frames.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </SelectField>
            <SelectField
              label="Super frame"
              value={form.super_frame_standard_id}
              onChange={(e) => setForm({ ...form, super_frame_standard_id: e.target.value })}
            >
              <option value="">None</option>
              {frames.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Frames, full box"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={form.default_frames_full}
                onChange={(e) => setForm({ ...form, default_frames_full: e.target.value })}
              />
              <TextInput
                label="Frames, nuc"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={form.default_frames_nuc}
                onChange={(e) => setForm({ ...form, default_frames_nuc: e.target.value })}
              />
            </div>
            <ToggleRow
              id="hive-system-active"
              label="Offered to users"
              description="Turn off to retire this system without removing it from existing models."
              checked={form.is_active}
              onChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </form>
        </ModalShell>
      )}
    </div>
  )
}

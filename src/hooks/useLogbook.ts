import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { LogbookEntry, LogbookEntryFormData } from '@/types/logbook'

interface UseLogbookReturn {
  entries: Record<string, LogbookEntry>
  loading: boolean
  fetchEntries: (userId: string) => Promise<void>
  saveEntry: (userId: string, skillId: string, formData: LogbookEntryFormData) => Promise<boolean>
  deleteEntry: (skillId: string, entryId: string) => Promise<boolean>
}

export function useLogbook(): UseLogbookReturn {
  const toast = useToast()
  const [entries, setEntries] = useState<Record<string, LogbookEntry>>({})
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('logbook_entries')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error

      const map: Record<string, LogbookEntry> = {}
      for (const entry of (data as LogbookEntry[]) || []) {
        map[entry.skill_id] = entry
      }
      setEntries(map)
    } catch {
      toast.error('Failed to load logbook entries')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const saveEntry = useCallback(async (
    userId: string,
    skillId: string,
    formData: LogbookEntryFormData
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('logbook_entries')
        .upsert({
          user_id: userId,
          skill_id: skillId,
          assessor_name: formData.assessor_name,
          assessor_fibka_number: formData.assessor_fibka_number || null,
          completed_date: formData.completed_date,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,skill_id' })
        .select()
        .single()

      if (error) throw error

      setEntries(prev => ({ ...prev, [skillId]: data as LogbookEntry }))
      toast.success('Skill marked as complete')
      return true
    } catch {
      toast.error('Failed to save entry')
      return false
    }
  }, [toast])

  const deleteEntry = useCallback(async (skillId: string, entryId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('logbook_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      setEntries(prev => {
        const next = { ...prev }
        delete next[skillId]
        return next
      })
      toast.success('Entry removed')
      return true
    } catch {
      toast.error('Failed to remove entry')
      return false
    }
  }, [toast])

  return { entries, loading, fetchEntries, saveEntry, deleteEntry }
}

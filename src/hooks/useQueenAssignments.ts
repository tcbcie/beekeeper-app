'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import type { QueenAssignment } from '@/types/queen'

export interface QueenAssignmentInput {
  location_type: 'hive' | 'nuc'
  location_label: string
  started_at: string
  ended_at: string | null
  notes: string | null
}

// PostgREST embeds may come back as an object or a single-element array
// depending on the relationship — normalise to a name string.
function readApiaryName(row: Record<string, unknown>): string | null {
  const ap = (row as { apiaries?: { name?: string } | { name?: string }[] | null }).apiaries
  if (!ap) return null
  if (Array.isArray(ap)) return ap[0]?.name ?? null
  return ap.name ?? null
}

// Same normalisation for the hive/nuc embeds used to resolve the live
// (post-rename) number of the location a stint points at.
function readEmbedName(value: unknown, key: 'hive_number' | 'nuc_number'): string | null {
  if (!value) return null
  const record = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined
  const name = record?.[key]
  return typeof name === 'string' && name.length > 0 ? name : null
}

export function useQueenAssignments(queenId: string | null | undefined) {
  const [assignments, setAssignments] = useState<QueenAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    if (!queenId) {
      setAssignments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('queen_assignments')
      .select('*, apiaries(name), hives(hive_number), mating_nucs(nuc_number)')
      .eq('queen_id', queenId)
      .order('started_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load queen assignments:', error)
      setAssignments([])
    } else {
      setAssignments(
        (data || []).map((row) => {
          const raw = row as Record<string, unknown>
          const base = row as unknown as QueenAssignment
          const liveLabel =
            readEmbedName(raw.hives, 'hive_number') ?? readEmbedName(raw.mating_nucs, 'nuc_number')
          return {
            ...base,
            apiary_name: readApiaryName(raw),
            // Prefer the live number so renames show through; the snapshot
            // remains the fallback for deleted hives/nucs and manual entries.
            display_label: liveLabel ?? base.location_label,
          }
        })
      )
    }
    setLoading(false)
  }, [queenId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const addAssignment = useCallback(
    async (input: QueenAssignmentInput): Promise<{ error: string | null }> => {
      if (!queenId) return { error: 'No queen selected' }
      const userId = await getCurrentUserId()
      if (!userId) return { error: 'Not signed in' }

      const { error } = await supabase.from('queen_assignments').insert({
        queen_id: queenId,
        location_type: input.location_type,
        location_label: input.location_label || null,
        started_at: input.started_at,
        ended_at: input.ended_at,
        notes: input.notes,
        source: 'manual',
        user_id: userId,
      })

      if (error) {
        if (error.code === '23505') {
          return { error: 'This queen already has a current location. Set an end date for a past entry.' }
        }
        return { error: error.message }
      }
      await fetchAssignments()
      return { error: null }
    },
    [queenId, fetchAssignments]
  )

  const updateAssignment = useCallback(
    async (id: string, input: QueenAssignmentInput): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from('queen_assignments')
        .update({
          location_type: input.location_type,
          location_label: input.location_label || null,
          started_at: input.started_at,
          ended_at: input.ended_at,
          notes: input.notes,
        })
        .eq('id', id)

      if (error) {
        if (error.code === '23505') {
          return { error: 'This queen already has a current location. Set an end date for a past entry.' }
        }
        return { error: error.message }
      }
      await fetchAssignments()
      return { error: null }
    },
    [fetchAssignments]
  )

  const deleteAssignment = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.from('queen_assignments').delete().eq('id', id)
      if (error) return { error: error.message }
      await fetchAssignments()
      return { error: null }
    },
    [fetchAssignments]
  )

  return { assignments, loading, refetch: fetchAssignments, addAssignment, updateAssignment, deleteAssignment }
}

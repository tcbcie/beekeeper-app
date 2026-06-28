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
      .select('*, apiaries(name)')
      .eq('queen_id', queenId)
      .order('started_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load queen assignments:', error)
      setAssignments([])
    } else {
      setAssignments(
        (data || []).map((row) => ({
          ...(row as unknown as QueenAssignment),
          apiary_name: readApiaryName(row as Record<string, unknown>),
        }))
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

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Queen } from '@/types/queen'

interface QueenParent {
  id: string
  queen_number: string
  marking_color: string
}

interface QueenHive {
  id: string
  hive_number: string
  apiary_name: string | null
}

interface QueenOffspring {
  id: string
  queen_number: string
  birth_date: string
  status: string
  marking_color: string
}

interface QueenSighting {
  id: string
  inspection_date: string
  queen_seen: boolean
  eggs_present: boolean
  hive_number: string
  hive_id: string
}

interface UseQueenDetailReturn {
  queen: Queen | null
  hive: QueenHive | null
  offspring: QueenOffspring[]
  sightings: QueenSighting[]
  loading: boolean
  isOwner: boolean
  fetchQueenData: (currentUserId: string) => Promise<void>
}

export function useQueenDetail(queenId: string): UseQueenDetailReturn {
  const toast = useToast()
  const [queen, setQueen] = useState<Queen | null>(null)
  const [hive, setHive] = useState<QueenHive | null>(null)
  const [offspring, setOffspring] = useState<QueenOffspring[]>([])
  const [sightings, setSightings] = useState<QueenSighting[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const requestIdRef = useRef(0)

  const fetchQueenData = useCallback(async (currentUserId: string) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setLoading(true)
    setQueen(null)
    setHive(null)
    setOffspring([])
    setSightings([])
    setIsOwner(false)

    try {
      // Fetch queen with relations
      const { data: queenData, error: queenError } = await supabase
        .from('queens')
        .select(`
          *,
          batch:rearing_batches!batch_id(id, batch_name),
          hives!queen_id(id, hive_number, apiaries(name))
        `)
        .eq('id', queenId)
        .single()

      if (queenError) throw queenError
      if (!queenData) throw new Error('Queen not found')

      const [motherRes, fatherRes] = await Promise.all([
        queenData.mother_id
          ? supabase
              .from('queens')
              .select('id, queen_number, marking_color')
              .eq('id', queenData.mother_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        queenData.father_id
          ? supabase
              .from('queens')
              .select('id, queen_number, marking_color')
              .eq('id', queenData.father_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (motherRes.error) throw motherRes.error
      if (fatherRes.error) throw fatherRes.error

      if (requestIdRef.current !== requestId) return

      const queenWithParents: Queen = {
        ...(queenData as Queen),
        mother: (motherRes.data as QueenParent | null) ?? null,
        father: (fatherRes.data as QueenParent | null) ?? null,
      }

      setQueen(queenWithParents)
      setIsOwner(queenData.user_id === currentUserId)

      const hiveData = queenData.hives
      const assignedHive = Array.isArray(hiveData) ? hiveData[0] : hiveData
      let assignedHiveId: string | null = null
      if (assignedHive?.id) {
        assignedHiveId = assignedHive.id
        setHive({
          id: assignedHive.id,
          hive_number: assignedHive.hive_number,
          apiary_name: Array.isArray(assignedHive.apiaries)
            ? assignedHive.apiaries[0]?.name || null
            : assignedHive.apiaries?.name || null,
        })
      }

      const offspringRes = await supabase.from('queens')
        .select('id, queen_number, birth_date, status, marking_color')
        .eq('mother_id', queenId)
        .order('birth_date', { ascending: false })

      if (requestIdRef.current !== requestId) return

      if (offspringRes.error) {
        console.error('Error fetching offspring:', offspringRes.error)
        setOffspring([])
      } else {
        setOffspring((offspringRes.data || []) as QueenOffspring[])
      }

      if (assignedHiveId) {
        const sightingsRes = await supabase.from('inspections')
          .select('id, inspection_date, queen_seen, eggs_present, hive_id, hives(hive_number)')
          .eq('hive_id', assignedHiveId)
          .order('inspection_date', { ascending: false })
          .limit(10)

        const sightingData = ((sightingsRes.data || []) as Array<{
          id: string
          inspection_date: string
          queen_seen: boolean
          eggs_present: boolean
          hive_id: string
          hives: { hive_number: string }[]
        }>).map(s => ({
          id: s.id,
          inspection_date: s.inspection_date,
          queen_seen: s.queen_seen,
          eggs_present: s.eggs_present,
          hive_number: s.hives?.[0]?.hive_number || '',
          hive_id: s.hive_id,
        }))

        if (requestIdRef.current !== requestId) return

        if (sightingsRes.error) {
          console.error('Error fetching queen sightings:', sightingsRes.error)
          setSightings([])
        } else {
          setSightings(sightingData)
        }
      }

    } catch (error) {
      if (requestIdRef.current !== requestId) return
      console.error('Error fetching queen data:', error)
      toast.error('Failed to load queen details')
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [queenId, toast])

  return {
    queen,
    hive,
    offspring,
    sightings,
    loading,
    isOwner,
    fetchQueenData,
  }
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { openScreenCache } from '@/lib/screen-cache'
import type { FrameStandardLabel, HiveModel, HiveSystem } from '@/types/hive-model'

interface HiveModelData {
  models: HiveModel[]
  systems: HiveSystem[]
  frameStandards: FrameStandardLabel[]
}

const EMPTY: HiveModelData = { models: [], systems: [], frameStandards: [] }

/**
 * The hive models this user can see, plus the hive systems and frame sizes needed to describe them.
 *
 * RLS returns the user's own models and any model on a hive they can access (a team-mate's shared
 * hive), so one plain select covers both. Models are resolved by id on the client: no PostgREST
 * embed, so there is no to-one embed shape to guess.
 *
 * The last copy shows at once from the screen cache. A failed load keeps whatever is on screen,
 * so a hive simply shows no model line rather than the screen emptying.
 */
export function useHiveModels(userId: string | null) {
  const [data, setData] = useState<HiveModelData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Only the newest load may set state.
  const seqRef = useRef(0)

  const reload = useCallback(async () => {
    if (!userId) return
    const seq = ++seqRef.current
    const cache = openScreenCache<HiveModelData>(userId, 'hive-models')
    let freshArrived = false
    cache.read().then((entry) => {
      if (!entry || freshArrived || seq !== seqRef.current) return
      setData(entry.data)
      setLoading(false)
    })

    const [modelsRes, systemsRes, framesRes] = await Promise.all([
      supabase.from('hive_models').select('*').order('name'),
      supabase.from('hive_systems').select('*').order('display_order'),
      supabase.from('frame_standards').select('id, label'),
    ])
    if (seq !== seqRef.current) return
    freshArrived = true

    const failed = modelsRes.error || systemsRes.error || framesRes.error
    if (failed) {
      console.error('Failed to load hive models:', failed)
      // Keep the last saved copy on screen: offline, the cache read may finish after the
      // network fails, and it must not then be ignored.
      const entry = await cache.read()
      if (seq !== seqRef.current) return
      if (entry) setData(entry.data)
      setError(failed.message || 'Could not load hive models')
      setLoading(false)
      return
    }

    const fresh: HiveModelData = {
      models: (modelsRes.data ?? []) as HiveModel[],
      systems: (systemsRes.data ?? []) as HiveSystem[],
      frameStandards: (framesRes.data ?? []) as FrameStandardLabel[],
    }
    setData(fresh)
    setError(null)
    setLoading(false)
    cache.save(fresh)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const modelsById = useMemo(() => new Map(data.models.map(m => [m.id, m])), [data.models])
  const systemsById = useMemo(() => new Map(data.systems.map(s => [s.id, s])), [data.systems])
  const frameStandardsById = useMemo(
    () => new Map(data.frameStandards.map(f => [f.id, f])),
    [data.frameStandards]
  )
  /** Models this user may pick for their own hives (a team-mate's shared models are display-only). */
  const ownModels = useMemo(
    () => (userId ? data.models.filter(m => m.user_id === userId) : []),
    [data.models, userId]
  )
  const activeSystems = useMemo(() => data.systems.filter(s => s.is_active), [data.systems])

  return {
    models: data.models,
    ownModels,
    systems: data.systems,
    activeSystems,
    modelsById,
    systemsById,
    frameStandardsById,
    loading,
    error,
    reload,
  }
}

'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type MatingNucBulkMode = 'numbered' | 'unnumbered'

export interface AvailableSealedGraft {
  id: string
  batch_id: string
  cell_number: number
  status: string
}

export interface MatingNucBulkRun {
  id: string
  user_id: string
  source_rearing_batch_id: string | null
  mode: MatingNucBulkMode
  requested_count: number
  created_count: number
  notes: string | null
  created_at: string
  rearing_batches?: {
    batch_name: string
  } | null
}

interface MatingNucBulkRunRow {
  id: string
  user_id: string
  source_rearing_batch_id: string | null
  mode: string
  requested_count: number
  created_count: number
  notes: string | null
  created_at: string
  rearing_batches?: { batch_name: string }[] | { batch_name: string } | null
}

export interface CreateMatingNucBulkInput {
  userId: string
  sourceBatchId: string
  mode: MatingNucBulkMode
  nucNumbers?: string[]
  selectedGraftIds?: string[]
  autoAssignSealedCells?: boolean
  matingLocation?: string
  notes?: string
  status?: string
}

export interface CreateMatingNucBulkResult {
  batchId: string
  createdCount: number
  requestedCount: number
  createdNucIds: string[]
}

const buildReferenceCode = (batchId: string, index: number) =>
  `NUC-${batchId.slice(0, 8).toUpperCase()}-${String(index + 1).padStart(3, '0')}`

const normaliseNucNumbers = (numbers: string[]) =>
  numbers
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value, idx, arr) => arr.indexOf(value) === idx)

export function useMatingNucBulk() {
  const fetchBulkRuns = useCallback(async (userId: string): Promise<MatingNucBulkRun[]> => {
    const { data, error } = await supabase
      .from('mating_nuc_batches')
      .select('id, user_id, source_rearing_batch_id, mode, requested_count, created_count, notes, created_at, rearing_batches(batch_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data || []) as MatingNucBulkRunRow[]
    return rows.map((row) => {
      const relatedBatch = Array.isArray(row.rearing_batches)
        ? (row.rearing_batches[0] || null)
        : (row.rearing_batches || null)

      return {
        id: row.id,
        user_id: row.user_id,
        source_rearing_batch_id: row.source_rearing_batch_id,
        mode: row.mode === 'unnumbered' ? 'unnumbered' : 'numbered',
        requested_count: row.requested_count,
        created_count: row.created_count,
        notes: row.notes,
        created_at: row.created_at,
        rearing_batches: relatedBatch ? { batch_name: relatedBatch.batch_name } : null,
      }
    })
  }, [])

  const fetchAvailableSealedGrafts = useCallback(async (userId: string, sourceBatchId: string): Promise<AvailableSealedGraft[]> => {
    if (!sourceBatchId) return []

    const { data: sealed, error: sealedError } = await supabase
      .from('batch_grafts')
      .select('id, batch_id, cell_number, status')
      .eq('user_id', userId)
      .eq('batch_id', sourceBatchId)
      .in('status', ['sealed', 'caged', 'emerged'])
      .order('cell_number')

    if (sealedError) throw sealedError

    const { data: activeNucs, error: activeNucsError } = await supabase
      .from('mating_nucs')
      .select('graft_id')
      .eq('user_id', userId)
      .is('retired_at', null)
      .not('graft_id', 'is', null)

    if (activeNucsError) throw activeNucsError

    const activeGraftIds = new Set((activeNucs || []).map((n) => n.graft_id).filter(Boolean))
    return ((sealed || []) as AvailableSealedGraft[]).filter((g) => !activeGraftIds.has(g.id))
  }, [])

  const createBulkNucs = useCallback(async (input: CreateMatingNucBulkInput): Promise<CreateMatingNucBulkResult> => {
    const {
      userId,
      sourceBatchId,
      mode,
      nucNumbers = [],
      selectedGraftIds = [],
      autoAssignSealedCells = true,
      matingLocation = '',
      notes = '',
      status = 'setup',
    } = input

    if (!sourceBatchId) throw new Error('Select a source batch first')

    const availableGrafts = await fetchAvailableSealedGrafts(userId, sourceBatchId)
    const availableGraftIds = new Set(availableGrafts.map((g) => g.id))

    const { data: sourceBatch, error: sourceBatchError } = await supabase
      .from('rearing_batches')
      .select('id, mother_queen_id')
      .eq('id', sourceBatchId)
      .eq('user_id', userId)
      .maybeSingle()

    if (sourceBatchError) throw sourceBatchError
    if (!sourceBatch) throw new Error('Selected batch was not found')

    let requestedCount = 0
    let finalNucNumbers: string[] = []
    let finalGraftIds: (string | null)[] = []

    if (mode === 'numbered') {
      finalNucNumbers = normaliseNucNumbers(nucNumbers)
      if (finalNucNumbers.length === 0) throw new Error('Enter at least one nuc number')

      const { data: existingActive, error: existingActiveError } = await supabase
        .from('mating_nucs')
        .select('nuc_number')
        .eq('user_id', userId)
        .is('retired_at', null)
        .in('nuc_number', finalNucNumbers)

      if (existingActiveError) throw existingActiveError
      if ((existingActive || []).length > 0) {
        const duplicates = (existingActive || []).map((r) => r.nuc_number).filter(Boolean).join(', ')
        throw new Error(`These nuc numbers are already active: ${duplicates}`)
      }

      requestedCount = finalNucNumbers.length

      if (autoAssignSealedCells) {
        finalGraftIds = availableGrafts.slice(0, requestedCount).map((g) => g.id)
      } else {
        const uniqueSelected = Array.from(new Set(selectedGraftIds.filter((id) => availableGraftIds.has(id))))
        finalGraftIds = uniqueSelected.slice(0, requestedCount)
      }

      while (finalGraftIds.length < requestedCount) finalGraftIds.push(null)
    } else {
      const uniqueSelected = Array.from(new Set(selectedGraftIds.filter((id) => availableGraftIds.has(id))))
      if (uniqueSelected.length === 0) throw new Error('Select at least one sealed cell')

      requestedCount = uniqueSelected.length
      finalGraftIds = uniqueSelected
      finalNucNumbers = new Array(requestedCount).fill('')
    }

    const { data: createdBatch, error: createdBatchError } = await supabase
      .from('mating_nuc_batches')
      .insert({
        user_id: userId,
        source_rearing_batch_id: sourceBatchId,
        mode,
        requested_count: requestedCount,
        created_count: 0,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (createdBatchError) throw createdBatchError

    const rowsToInsert = Array.from({ length: requestedCount }, (_, index) => {
      const referenceCode = buildReferenceCode(createdBatch.id, index)
      const nucNumber = mode === 'numbered' ? finalNucNumbers[index] : referenceCode
      return {
        user_id: userId,
        nuc_number: nucNumber,
        reference_code: referenceCode,
        creation_batch_id: createdBatch.id,
        batch_id: sourceBatchId,
        graft_id: finalGraftIds[index] || null,
        queen_id: sourceBatch.mother_queen_id || null,
        mating_location: matingLocation || null,
        status,
        notes: notes || null,
      }
    })

    const { data: createdNucs, error: createdNucsError } = await supabase
      .from('mating_nucs')
      .insert(rowsToInsert)
      .select('id, graft_id')

    if (createdNucsError) throw createdNucsError

    const graftIdsToUpdate = (createdNucs || []).map((n) => n.graft_id).filter(Boolean) as string[]
    if (graftIdsToUpdate.length > 0) {
      const { error: graftStatusError } = await supabase
        .from('batch_grafts')
        .update({ status: 'in_nuc', status_date: new Date().toISOString().split('T')[0] })
        .in('id', graftIdsToUpdate)
      if (graftStatusError) throw graftStatusError
    }

    const createdCount = (createdNucs || []).length
    const { error: batchUpdateError } = await supabase
      .from('mating_nuc_batches')
      .update({ created_count: createdCount, updated_at: new Date().toISOString() })
      .eq('id', createdBatch.id)

    if (batchUpdateError) throw batchUpdateError

    return {
      batchId: createdBatch.id,
      createdCount,
      requestedCount,
      createdNucIds: (createdNucs || []).map((n) => n.id),
    }
  }, [fetchAvailableSealedGrafts])

  return {
    fetchBulkRuns,
    fetchAvailableSealedGrafts,
    createBulkNucs,
  }
}

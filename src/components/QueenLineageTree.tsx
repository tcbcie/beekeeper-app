'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Crown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface QueenNode {
  id: string
  queen_number: string
  marking_color: string
  status: string
  birth_date?: string
  hive_number?: string
  apiary_name?: string
}

interface QueenRecord extends QueenNode {
  mother_id?: string | null
  father_id?: string | null
}

interface LineageData {
  queen: QueenNode | null
  mother: QueenNode | null
  father: QueenNode | null
  grandmother: QueenNode | null
  grandfather: QueenNode | null
  greatGrandmother: QueenNode | null
  greatGrandfather: QueenNode | null
  children: QueenNode[]
  siblings: QueenNode[]
  warnings: string[]
}

interface QueenLineageTreeProps {
  queenId: string
  expanded: boolean
  onToggle: () => void
  // Distributed queens have no local mother FK; show this snapshot label in the Mother slot.
  motherFallback?: string
}

const getColorClass = (color: string): string => {
  switch (color) {
    case 'Yellow':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
    case 'Red':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
    case 'Green':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800'
    case 'Blue':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
    case 'White':
      return 'bg-surface-secondary text-text-secondary border-border'
    default:
      return 'bg-surface-secondary text-text-secondary border-border'
  }
}

// Extract hive_number and apiary_name from Supabase join result (may be array or object)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractQueenNode = (raw: any): QueenNode => {
  const hiveData = Array.isArray(raw.hives) ? raw.hives[0] : raw.hives
  const apiaryData = hiveData?.apiaries
  const apiary = Array.isArray(apiaryData) ? apiaryData[0] : apiaryData
  return {
    id: raw.id,
    queen_number: raw.queen_number,
    marking_color: raw.marking_color,
    status: raw.status,
    birth_date: raw.birth_date,
    hive_number: hiveData?.hive_number || undefined,
    apiary_name: apiary?.name || undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractQueenRecord = (raw: any): QueenRecord => ({
  ...extractQueenNode(raw),
  mother_id: raw.mother_id || null,
  father_id: raw.father_id || null,
})

const QueenCard = ({ queen, label, isMain = false, fallbackLabel }: { queen: QueenNode | null; label: string; isMain?: boolean; fallbackLabel?: string }) => {
  if (!queen) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-text-tertiary mb-1">{label}</span>
        <div className="px-3 py-2 rounded-lg border border-dashed border-border bg-surface-elevated/50 text-text-tertiary text-sm" title={fallbackLabel || undefined}>
          {fallbackLabel ? fallbackLabel.split(' (')[0] : 'Unknown'}
        </div>
      </div>
    )
  }

  const cardContent = (
    <div
      className={`px-3 py-2 rounded-lg border ${getColorClass(queen.marking_color)} ${
        isMain ? 'ring-2 ring-forest-500 ring-offset-2 dark:ring-offset-slate-900' : ''
      } ${!isMain ? 'hover:opacity-80 cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-1">
        {isMain && <Crown size={14} className="text-amber-500" />}
        <span className="font-medium text-sm">{queen.queen_number}</span>
      </div>
      {queen.status && queen.status !== 'active' && (
        <span className="text-xs opacity-70">({queen.status})</span>
      )}
      {(queen.hive_number || queen.apiary_name) && (
        <div className="text-xs opacity-70 mt-0.5">
          {queen.hive_number && <span>{queen.hive_number}</span>}
          {queen.hive_number && queen.apiary_name && <span> · </span>}
          {queen.apiary_name && <span>{queen.apiary_name}</span>}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-text-tertiary mb-1">{label}</span>
      {isMain ? cardContent : (
        <Link href={`/dashboard/queens/${queen.id}`}>
          {cardContent}
        </Link>
      )}
    </div>
  )
}

export default function QueenLineageTree({ queenId, expanded, onToggle, motherFallback }: QueenLineageTreeProps) {
  const [lineage, setLineage] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchQueenById = useCallback(async (id: string): Promise<QueenRecord | null> => {
    const { data, error } = await supabase
      .from('queens')
      .select('id, queen_number, marking_color, status, birth_date, mother_id, father_id, hives!queen_id(hive_number, apiaries(name))')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? extractQueenRecord(data) : null
  }, [])

  const fetchLineage = useCallback(async (targetQueenId: string): Promise<LineageData | null> => {
    const queen = await fetchQueenById(targetQueenId)

    if (!queen) {
      return null
    }

    const displayedQueenIds = new Set<string>([queen.id])
    const warnings = new Set<string>()

    const fetchUniqueRelation = async (
      relatedId: string | null | undefined,
      warningMessage: string
    ): Promise<QueenRecord | null> => {
      if (!relatedId) return null

      const relatedQueen = await fetchQueenById(relatedId)
      if (!relatedQueen) return null

      if (displayedQueenIds.has(relatedQueen.id)) {
        warnings.add(warningMessage)
        return null
      }

      displayedQueenIds.add(relatedQueen.id)
      return relatedQueen
    }

    const mother = await fetchUniqueRelation(
      queen.mother_id,
      'Repeated parent links were hidden in the lineage tree.'
    )
    const father = await fetchUniqueRelation(
      queen.father_id,
      'Repeated parent links were hidden in the lineage tree.'
    )
    const grandmother = mother
      ? await fetchUniqueRelation(
          mother.mother_id,
          'Repeated ancestor links were hidden in the lineage tree.'
        )
      : null
    const grandfather = mother
      ? await fetchUniqueRelation(
          mother.father_id,
          'Repeated ancestor links were hidden in the lineage tree.'
        )
      : null
    const greatGrandmother = grandmother
      ? await fetchUniqueRelation(
          grandmother.mother_id,
          'Repeated ancestor links were hidden in the lineage tree.'
        )
      : null
    const greatGrandfather = grandmother
      ? await fetchUniqueRelation(
          grandmother.father_id,
          'Repeated ancestor links were hidden in the lineage tree.'
        )
      : null

    const { data: childrenData, error: childrenError } = await supabase
      .from('queens')
      .select('id, queen_number, marking_color, status, hives!queen_id(hive_number, apiaries(name))')
      .eq('mother_id', targetQueenId)
      .order('birth_date', { ascending: false })

    if (childrenError) throw childrenError

    const children = (childrenData || [])
      .map(extractQueenNode)
      .filter((child) => {
        if (displayedQueenIds.has(child.id)) {
          warnings.add('Repeated descendant links were hidden in the lineage tree.')
          return false
        }

        displayedQueenIds.add(child.id)
        return true
      })

    let siblings: QueenNode[] = []
    if (queen.mother_id) {
      const { data: siblingsData, error: siblingsError } = await supabase
        .from('queens')
        .select('id, queen_number, marking_color, status, hives!queen_id(hive_number, apiaries(name))')
        .eq('mother_id', queen.mother_id)
        .neq('id', targetQueenId)
        .limit(5)

      if (siblingsError) throw siblingsError

      siblings = (siblingsData || [])
        .map(extractQueenNode)
        .filter((sibling) => {
          if (displayedQueenIds.has(sibling.id)) {
            warnings.add('Repeated sibling links were hidden in the lineage tree.')
            return false
          }

          displayedQueenIds.add(sibling.id)
          return true
        })
    }

    return {
      queen,
      mother,
      father,
      grandmother,
      grandfather,
      greatGrandmother,
      greatGrandfather,
      children,
      siblings,
      warnings: Array.from(warnings),
    }
  }, [fetchQueenById])

  useEffect(() => {
    if (!expanded || !queenId) {
      requestIdRef.current += 1
      setLoading(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        const nextLineage = await fetchLineage(queenId)
        if (requestIdRef.current !== requestId) return

        if (!nextLineage) {
          setLineage(null)
          setError('Failed to load lineage data')
          return
        }

        setLineage(nextLineage)
      } catch (err) {
        if (requestIdRef.current !== requestId) return
        console.error('Error fetching lineage:', err)
        setLineage(null)
        setError('Failed to load lineage data')
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1
      }
    }
  }, [expanded, queenId, fetchLineage])

  return (
    <div className="border border-border rounded-lg bg-surface-elevated/50 mt-4">
      <Button
        onClick={onToggle}
        tone="neutral"
        className="w-full justify-between px-4 py-3 text-left hover:bg-surface-secondary rounded-lg"
      >
        <span className="font-medium text-foreground flex items-center gap-2">
          <Crown size={16} className="text-amber-500" />
          Queen Lineage
        </span>
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </Button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {loading ? (
            <div className="py-8 text-center text-text-secondary">Loading lineage...</div>
          ) : lineage ? (
            <div className="pt-4 space-y-6">
              {lineage.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                  {lineage.warnings.join(' ')}
                </div>
              )}

              {/* Great-grandparents row */}
              {(lineage.greatGrandmother || lineage.greatGrandfather) && (
                <div className="flex justify-center gap-8">
                  <QueenCard queen={lineage.greatGrandmother} label="Great-Grandmother" />
                  <QueenCard queen={lineage.greatGrandfather} label="Great-Grandfather" />
                </div>
              )}

              {/* Connector line */}
              {(lineage.greatGrandmother || lineage.greatGrandfather) && (
                <div className="flex justify-center">
                  <div className="w-px h-4 bg-border"></div>
                </div>
              )}

              {/* Grandparents row */}
              {(lineage.grandmother || lineage.grandfather) && (
                <div className="flex justify-center gap-8">
                  <QueenCard queen={lineage.grandmother} label="Grandmother" />
                  <QueenCard queen={lineage.grandfather} label="Grandfather" />
                </div>
              )}

              {/* Connector line */}
              {(lineage.grandmother || lineage.grandfather) && (
                <div className="flex justify-center">
                  <div className="w-px h-4 bg-border"></div>
                </div>
              )}

              {/* Parents row */}
              <div className="flex justify-center gap-8">
                <QueenCard queen={lineage.mother} label="Mother" fallbackLabel={motherFallback} />
                <QueenCard queen={lineage.father} label="Father" />
              </div>

              {/* Connector line */}
              <div className="flex justify-center">
                <div className="w-px h-4 bg-border"></div>
              </div>

              {/* Current queen */}
              <div className="flex justify-center">
                <QueenCard queen={lineage.queen} label="Current Queen" isMain />
              </div>

              {/* Children */}
              {lineage.children.length > 0 && (
                <>
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-border"></div>
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary text-center mb-2">
                      Daughters ({lineage.children.length})
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {lineage.children.slice(0, 6).map((child) => (
                        <Link key={child.id} href={`/dashboard/queens/${child.id}`}>
                          <div
                            className={`px-2 py-1 rounded border text-xs hover:opacity-80 cursor-pointer ${getColorClass(child.marking_color)}`}
                          >
                            <div>{child.queen_number}</div>
                            {(child.hive_number || child.apiary_name) && (
                              <div className="opacity-70">
                                {child.hive_number}{child.hive_number && child.apiary_name ? ' · ' : ''}{child.apiary_name}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                      {lineage.children.length > 6 && (
                        <span className="text-xs text-text-tertiary self-center">
                          +{lineage.children.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Siblings */}
              {lineage.siblings.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-text-tertiary mb-2">
                    Sisters (same mother): {lineage.siblings.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lineage.siblings.map((sibling) => (
                      <Link key={sibling.id} href={`/dashboard/queens/${sibling.id}`}>
                        <div
                          className={`px-2 py-1 rounded border text-xs hover:opacity-80 cursor-pointer ${getColorClass(sibling.marking_color)}`}
                        >
                          <div>{sibling.queen_number}</div>
                          {(sibling.hive_number || sibling.apiary_name) && (
                            <div className="opacity-70">
                              {sibling.hive_number}{sibling.hive_number && sibling.apiary_name ? ' · ' : ''}{sibling.apiary_name}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-600 dark:text-red-400">{error}</div>
          ) : (
            <div className="py-8 text-center text-text-secondary">No lineage data available</div>
          )}
        </div>
      )}
    </div>
  )
}

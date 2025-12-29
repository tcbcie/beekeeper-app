'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Crown } from 'lucide-react'

interface QueenNode {
  id: string
  queen_number: string
  marking_color: string
  status: string
  birth_date?: string
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
}

interface QueenLineageTreeProps {
  queenId: string
  expanded: boolean
  onToggle: () => void
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
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    default:
      return 'bg-sage-100 dark:bg-slate-800/50 text-text-secondary border-border'
  }
}

const QueenCard = ({ queen, label, isMain = false }: { queen: QueenNode | null; label: string; isMain?: boolean }) => {
  if (!queen) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-text-tertiary mb-1">{label}</span>
        <div className="px-3 py-2 rounded-lg border border-dashed border-border bg-surface-elevated/50 text-text-tertiary text-sm">
          Unknown
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-text-tertiary mb-1">{label}</span>
      <div
        className={`px-3 py-2 rounded-lg border ${getColorClass(queen.marking_color)} ${
          isMain ? 'ring-2 ring-forest-500 ring-offset-2 dark:ring-offset-slate-900' : ''
        }`}
      >
        <div className="flex items-center gap-1">
          {isMain && <Crown size={14} className="text-amber-500" />}
          <span className="font-medium text-sm">{queen.queen_number}</span>
        </div>
        {queen.status && queen.status !== 'active' && (
          <span className="text-xs opacity-70">({queen.status})</span>
        )}
      </div>
    </div>
  )
}

export default function QueenLineageTree({ queenId, expanded, onToggle }: QueenLineageTreeProps) {
  const [lineage, setLineage] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchLineage = useCallback(async () => {
    if (!queenId) return
    setLoading(true)

    try {
      // Fetch the queen with mother and father
      const { data: queen, error: queenError } = await supabase
        .from('queens')
        .select(`
          id, queen_number, marking_color, status, birth_date, mother_id, father_id,
          mother:queens!queens_mother_id_fkey(id, queen_number, marking_color, status, mother_id, father_id),
          father:queens!queens_father_id_fkey(id, queen_number, marking_color, status)
        `)
        .eq('id', queenId)
        .single()

      if (queenError || !queen) {
        console.error('Error fetching queen:', queenError)
        setLoading(false)
        return
      }

      // Fetch grandparents if mother exists
      let grandmother: QueenNode | null = null
      let grandfather: QueenNode | null = null
      let greatGrandmother: QueenNode | null = null
      let greatGrandfather: QueenNode | null = null

      // Supabase may return the relation as object or array - handle both cases
      const motherData = Array.isArray(queen.mother) ? queen.mother[0] : queen.mother
      const mother = motherData as (QueenNode & { mother_id?: string; father_id?: string }) | null
      if (mother?.mother_id) {
        const { data: gm } = await supabase
          .from('queens')
          .select('id, queen_number, marking_color, status, mother_id, father_id')
          .eq('id', mother.mother_id)
          .single()
        grandmother = gm as QueenNode | null

        // Fetch great-grandparents
        if (gm?.mother_id) {
          const { data: ggm } = await supabase
            .from('queens')
            .select('id, queen_number, marking_color, status')
            .eq('id', gm.mother_id)
            .single()
          greatGrandmother = ggm as QueenNode | null
        }
        if (gm?.father_id) {
          const { data: ggf } = await supabase
            .from('queens')
            .select('id, queen_number, marking_color, status')
            .eq('id', gm.father_id)
            .single()
          greatGrandfather = ggf as QueenNode | null
        }
      }
      if (mother?.father_id) {
        const { data: gf } = await supabase
          .from('queens')
          .select('id, queen_number, marking_color, status')
          .eq('id', mother.father_id)
          .single()
        grandfather = gf as QueenNode | null
      }

      // Fetch children (queens where mother_id = this queen)
      const { data: childrenData } = await supabase
        .from('queens')
        .select('id, queen_number, marking_color, status')
        .eq('mother_id', queenId)
        .order('birth_date', { ascending: false })

      // Fetch siblings (same mother)
      let siblings: QueenNode[] = []
      if (queen.mother_id) {
        const { data: siblingsData } = await supabase
          .from('queens')
          .select('id, queen_number, marking_color, status')
          .eq('mother_id', queen.mother_id)
          .neq('id', queenId)
          .limit(5)
        siblings = (siblingsData as QueenNode[]) || []
      }

      // Handle father relation the same way
      const fatherData = Array.isArray(queen.father) ? queen.father[0] : queen.father

      setLineage({
        queen: {
          id: queen.id,
          queen_number: queen.queen_number,
          marking_color: queen.marking_color,
          status: queen.status,
        },
        mother: mother as QueenNode | null,
        father: fatherData as QueenNode | null,
        grandmother,
        grandfather,
        greatGrandmother,
        greatGrandfather,
        children: (childrenData as QueenNode[]) || [],
        siblings,
      })
    } catch (error) {
      console.error('Error fetching lineage:', error)
    } finally {
      setLoading(false)
    }
  }, [queenId])

  useEffect(() => {
    if (expanded && queenId) {
      fetchLineage()
    }
  }, [expanded, queenId, fetchLineage])

  return (
    <div className="border border-border rounded-lg bg-surface-elevated/50 mt-4">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-sage-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
      >
        <span className="font-medium text-foreground flex items-center gap-2">
          <Crown size={16} className="text-amber-500" />
          Queen Lineage
        </span>
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {loading ? (
            <div className="py-8 text-center text-text-secondary">Loading lineage...</div>
          ) : lineage ? (
            <div className="pt-4 space-y-6">
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
                <QueenCard queen={lineage.mother} label="Mother" />
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
                    <p className="text-xs text-text-tertiary text-center mb-2">
                      Daughters ({lineage.children.length})
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {lineage.children.slice(0, 6).map((child) => (
                        <div
                          key={child.id}
                          className={`px-2 py-1 rounded border text-xs ${getColorClass(child.marking_color)}`}
                        >
                          {child.queen_number}
                        </div>
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
                  <p className="text-xs text-text-tertiary mb-2">
                    Sisters (same mother): {lineage.siblings.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lineage.siblings.map((sibling) => (
                      <div
                        key={sibling.id}
                        className={`px-2 py-1 rounded border text-xs ${getColorClass(sibling.marking_color)}`}
                      >
                        {sibling.queen_number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-text-secondary">No lineage data available</div>
          )}
        </div>
      )}
    </div>
  )
}

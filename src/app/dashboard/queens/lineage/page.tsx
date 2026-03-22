'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Crown, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'

interface LineageQueen {
  id: string
  queen_number: string
  marking_color: string
  status: string
  mother_id: string | null
  hive_number?: string
  apiary_name?: string
  apiary_id?: string
}

interface FamilyTree {
  queen: LineageQueen
  children: FamilyTree[]
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

function TreeNode({ node, depth = 0 }: { node: FamilyTree; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}>
      <div className="flex items-center gap-2 py-1.5">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-surface-secondary text-text-tertiary"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {!hasChildren && <span className="w-5" />}
        <Link href={`/dashboard/queens/${node.queen.id}`}>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:opacity-80 cursor-pointer ${getColorClass(node.queen.marking_color)}`}
          >
            {depth === 0 && <Crown size={14} className="text-amber-500" />}
            <span className="font-medium">{node.queen.queen_number}</span>
            {node.queen.status !== 'active' && (
              <span className="text-xs opacity-70">({node.queen.status})</span>
            )}
            {(node.queen.hive_number || node.queen.apiary_name) && (
              <span className="text-xs opacity-70">
                {node.queen.hive_number}{node.queen.hive_number && node.queen.apiary_name ? ' · ' : ''}{node.queen.apiary_name}
              </span>
            )}
            {hasChildren && (
              <span className="text-xs opacity-60">
                ({node.children.length} daughter{node.children.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </Link>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.queen.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function QueenLineageOverviewPage() {
  const [trees, setTrees] = useState<FamilyTree[]>([])
  const [allQueens, setAllQueens] = useState<LineageQueen[]>([])
  const [loading, setLoading] = useState(true)
  const [apiaryFilter, setApiaryFilter] = useState<string>('all')
  const [apiaries, setApiaries] = useState<{ id: string; name: string }[]>([])

  const fetchData = useCallback(async () => {
    const userId = await getCurrentUserId()
    if (!userId) return

    // Fetch all queens with their hive/apiary info
    const { data: queens } = await supabase
      .from('queens')
      .select('id, queen_number, marking_color, status, mother_id, hives!queen_id(hive_number, apiaries(id, name))')
      .eq('user_id', userId)
      .order('queen_number')

    if (!queens) {
      setLoading(false)
      return
    }

    // Extract queen nodes with hive/apiary
    const queenNodes: LineageQueen[] = queens.map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = q as any
      const hiveData = Array.isArray(raw.hives) ? raw.hives[0] : raw.hives
      const apiaryData = hiveData?.apiaries
      const apiary = Array.isArray(apiaryData) ? apiaryData[0] : apiaryData
      return {
        id: q.id,
        queen_number: q.queen_number,
        marking_color: q.marking_color,
        status: q.status,
        mother_id: q.mother_id,
        hive_number: hiveData?.hive_number || undefined,
        apiary_name: apiary?.name || undefined,
        apiary_id: apiary?.id || undefined,
      }
    })

    setAllQueens(queenNodes)

    // Collect unique apiaries
    const apiaryMap = new Map<string, string>()
    queenNodes.forEach((q) => {
      if (q.apiary_id && q.apiary_name) {
        apiaryMap.set(q.apiary_id, q.apiary_name)
      }
    })
    setApiaries(Array.from(apiaryMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))

    setLoading(false)
  }, [])

  // Build trees from queens whenever allQueens or filter changes
  useEffect(() => {
    if (allQueens.length === 0) return

    // Filter queens that are part of any lineage (have mother or have children)
    const queenIds = new Set(allQueens.map((q) => q.id))
    const hasChildren = new Set<string>()
    allQueens.forEach((q) => {
      if (q.mother_id && queenIds.has(q.mother_id)) {
        hasChildren.add(q.mother_id)
      }
    })

    const lineageQueens = allQueens.filter(
      (q) => (q.mother_id && queenIds.has(q.mother_id)) || hasChildren.has(q.id)
    )

    // Apply apiary filter: include queen if it or any descendant/ancestor matches the apiary
    let filteredQueens = lineageQueens
    if (apiaryFilter !== 'all') {
      // Find all queens in the filtered apiary
      const apiaryQueenIds = new Set(lineageQueens.filter((q) => q.apiary_id === apiaryFilter).map((q) => q.id))

      // Walk up and down to include full lineage chains
      let changed = true
      const includeIds = new Set(apiaryQueenIds)
      while (changed) {
        changed = false
        lineageQueens.forEach((q) => {
          if (includeIds.has(q.id)) return
          // Include parent if child is included
          if (q.mother_id && includeIds.has(q.mother_id)) {
            // This is a child of an included queen
          }
          // Include children if parent is included
        })
        // Simpler: include all ancestors and descendants of apiary queens
        lineageQueens.forEach((q) => {
          if (includeIds.has(q.id)) {
            // include children
            lineageQueens.forEach((child) => {
              if (child.mother_id === q.id && !includeIds.has(child.id)) {
                includeIds.add(child.id)
                changed = true
              }
            })
          }
          // include parents
          if (q.mother_id && includeIds.has(q.id) && !includeIds.has(q.mother_id)) {
            const parent = lineageQueens.find((p) => p.id === q.mother_id)
            if (parent) {
              includeIds.add(parent.id)
              changed = true
            }
          }
        })
      }
      filteredQueens = lineageQueens.filter((q) => includeIds.has(q.id))
    }

    // Build tree structures
    const queenMap = new Map(filteredQueens.map((q) => [q.id, q]))
    const childrenMap = new Map<string, LineageQueen[]>()
    filteredQueens.forEach((q) => {
      if (q.mother_id && queenMap.has(q.mother_id)) {
        const siblings = childrenMap.get(q.mother_id) || []
        siblings.push(q)
        childrenMap.set(q.mother_id, siblings)
      }
    })

    const buildTree = (queen: LineageQueen): FamilyTree => ({
      queen,
      children: (childrenMap.get(queen.id) || []).map(buildTree),
    })

    // Find roots (queens with no mother in our set)
    const roots = filteredQueens.filter((q) => !q.mother_id || !queenMap.has(q.mother_id))
    const familyTrees = roots.map(buildTree)

    setTrees(familyTrees)
  }, [allQueens, apiaryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <LoadingSpinner text="Loading lineage data..." />

  const lineageQueenCount = new Set(trees.flatMap(function countAll(t: FamilyTree): string[] {
    return [t.queen.id, ...t.children.flatMap(countAll)]
  })).size

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/queens">
            <Button tone="neutral" className="p-2">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Crown size={28} className="text-amber-500" />
            Queen Lineage Overview
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm text-text-secondary mr-2">Apiary:</label>
          <select
            value={apiaryFilter}
            onChange={(e) => setApiaryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm min-h-[44px]"
          >
            <option value="all">All Apiaries</option>
            {apiaries.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-text-secondary">
          {trees.length} lineage{trees.length !== 1 ? 's' : ''} · {lineageQueenCount} queen{lineageQueenCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lineage Trees */}
      {trees.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <Crown size={48} className="mx-auto mb-4 text-text-tertiary" />
          <p className="text-lg font-medium">No lineage data found</p>
          <p className="text-sm mt-1">
            Set mother/father relationships on your queens to build lineage trees.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {trees.map((tree) => (
            <div
              key={tree.queen.id}
              className="bg-surface-elevated border border-border rounded-lg p-4"
            >
              <TreeNode node={tree} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

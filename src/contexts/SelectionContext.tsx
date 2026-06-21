'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePersistentState } from '@/hooks/usePersistentState'

/**
 * A small, app-wide "current selection" shared across dashboard pages so that
 * choosing an apiary/hive on one page (e.g. Hives) carries over to others
 * (e.g. Tasks, Reports) instead of resetting on every navigation.
 *
 * Convention: an empty string `''` means "no specific selection" (i.e. all).
 * Pages that use a different sentinel (e.g. `'all'`) map to/from `''` at their
 * own boundary so this store stays simple and unambiguous.
 *
 * Backed by localStorage via {@link usePersistentState}, so the selection also
 * survives a full browser/app restart.
 */
interface SelectionContextType {
  selectedApiaryId: string
  setSelectedApiaryId: (id: string) => void
  selectedHiveId: string
  setSelectedHiveId: (id: string) => void
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedApiaryId, setSelectedApiaryId] = usePersistentState<string>('shared:apiary', '')
  const [selectedHiveId, setSelectedHiveId] = usePersistentState<string>('shared:hive', '')

  return (
    <SelectionContext.Provider
      value={{ selectedApiaryId, setSelectedApiaryId, selectedHiveId, setSelectedHiveId }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection(): SelectionContextType {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}

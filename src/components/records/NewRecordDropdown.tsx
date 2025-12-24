'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { RecordType } from '@/types/records'

interface NewRecordDropdownProps {
  onSelectType: (type: RecordType) => void
}

export default function NewRecordDropdown({ onSelectType }: NewRecordDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (type: RecordType) => {
    onSelectType(type)
    setShowDropdown(false)
  }

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-4 py-2 min-h-[48px] bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 font-medium flex items-center gap-2 justify-center touch-manipulation w-full sm:w-auto"
      >
        <Plus size={18} />
        New Record
        <ChevronDown size={18} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-surface dark:bg-surface rounded-lg shadow-lg border border-border z-10">
          <button
            onClick={() => handleSelect('inspection')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 rounded-t-lg transition-colors"
          >
            <Plus size={16} />
            Hive Inspection
          </button>
          <button
            onClick={() => handleSelect('varroa_treatment')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Varroa Treatment
          </button>
          <button
            onClick={() => handleSelect('varroa_check')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Varroa Check
          </button>
          <button
            onClick={() => handleSelect('feeding')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Feeding
          </button>
          <button
            onClick={() => handleSelect('harvest')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 rounded-b-lg transition-colors"
          >
            <Plus size={16} />
            Harvest
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { RecordType } from '@/types/records'
import Button from '@/components/ui/Button'

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
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-3 sm:px-4 py-2 min-h-[44px] bg-forest-600 text-white rounded-lg hover:bg-forest-700 active:bg-forest-800 font-medium flex items-center gap-1.5 sm:gap-2 justify-center touch-manipulation whitespace-nowrap"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">New Record</span>
        <span className="sm:hidden">New</span>
        <ChevronDown size={16} />
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-surface dark:bg-surface rounded-lg shadow-lg border border-border z-10">
          <Button
            onClick={() => handleSelect('inspection')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 rounded-t-lg transition-colors"
          >
            <Plus size={16} />
            Hive Inspection
          </Button>
          <Button
            onClick={() => handleSelect('varroa_treatment')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Varroa Treatment
          </Button>
          <Button
            onClick={() => handleSelect('varroa_check')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Varroa Check
          </Button>
          <Button
            onClick={() => handleSelect('feeding')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Feeding
          </Button>
          <Button
            onClick={() => handleSelect('harvest')}
            className="w-full px-4 py-3 text-left text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 rounded-b-lg transition-colors"
          >
            <Plus size={16} />
            Harvest
          </Button>
        </div>
      )}
    </div>
  )
}


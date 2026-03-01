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
  const itemBaseClass = 'w-full px-4 py-3 text-left bg-surface text-foreground dark:bg-surface dark:text-text-primary flex items-center justify-start gap-2 transition-colors'
  const blueItemClass = 'hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 active:bg-blue-100 active:text-blue-900 dark:active:bg-blue-900/60 dark:active:text-blue-100'
  const indigoItemClass = 'hover:bg-indigo-50 hover:text-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-100 active:bg-indigo-100 active:text-indigo-900 dark:active:bg-indigo-900/60 dark:active:text-indigo-100'

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
        <div className="absolute right-0 mt-2 w-56 bg-surface dark:bg-surface rounded-lg shadow-lg border border-border z-10 overflow-hidden">
          <Button
            unstyled
            onClick={() => handleSelect('inspection')}
            className={`${itemBaseClass} ${blueItemClass} rounded-t-lg`}
          >
            <Plus size={16} />
            Hive Inspection
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('varroa_treatment')}
            className={`${itemBaseClass} ${blueItemClass}`}
          >
            <Plus size={16} />
            Varroa Treatment
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('varroa_check')}
            className={`${itemBaseClass} ${blueItemClass}`}
          >
            <Plus size={16} />
            Varroa Check
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('feeding')}
            className={`${itemBaseClass} ${indigoItemClass}`}
          >
            <Plus size={16} />
            Feeding
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('harvest')}
            className={`${itemBaseClass} ${indigoItemClass} rounded-b-lg`}
          >
            <Plus size={16} />
            Harvest
          </Button>
        </div>
      )}
    </div>
  )
}


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
  const itemBaseClass = 'group w-full px-4 py-3 text-left bg-surface text-text-primary flex items-center justify-start gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60'
  const blueItemClass = 'hover:bg-blue-100 hover:text-blue-950 focus-visible:bg-blue-100 focus-visible:text-blue-950 active:bg-blue-200 active:text-blue-950 dark:hover:bg-blue-900/80 dark:hover:text-blue-50 dark:focus-visible:bg-blue-900/80 dark:focus-visible:text-blue-50 dark:active:bg-blue-800 dark:active:text-white'
  const indigoItemClass = 'hover:bg-indigo-100 hover:text-indigo-950 focus-visible:bg-indigo-100 focus-visible:text-indigo-950 active:bg-indigo-200 active:text-indigo-950 dark:hover:bg-indigo-900/80 dark:hover:text-indigo-50 dark:focus-visible:bg-indigo-900/80 dark:focus-visible:text-indigo-50 dark:active:bg-indigo-800 dark:active:text-white'
  const blueIconClass = 'h-4 w-4 shrink-0 text-blue-700 group-hover:text-blue-900 group-focus-visible:text-blue-900 group-active:text-blue-950 dark:text-blue-300 dark:group-hover:text-blue-100 dark:group-focus-visible:text-blue-100 dark:group-active:text-white'
  const indigoIconClass = 'h-4 w-4 shrink-0 text-indigo-700 group-hover:text-indigo-900 group-focus-visible:text-indigo-900 group-active:text-indigo-950 dark:text-indigo-300 dark:group-hover:text-indigo-100 dark:group-focus-visible:text-indigo-100 dark:group-active:text-white'

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
        <div className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg border border-border z-10 overflow-hidden">
          <Button
            unstyled
            onClick={() => handleSelect('inspection')}
            className={`${itemBaseClass} ${blueItemClass} rounded-t-lg`}
          >
            <Plus className={blueIconClass} size={17} strokeWidth={2.25} />
            Hive Inspection
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('varroa_treatment')}
            className={`${itemBaseClass} ${blueItemClass}`}
          >
            <Plus className={blueIconClass} size={17} strokeWidth={2.25} />
            Varroa Treatment
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('varroa_check')}
            className={`${itemBaseClass} ${blueItemClass}`}
          >
            <Plus className={blueIconClass} size={17} strokeWidth={2.25} />
            Varroa Check
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('feeding')}
            className={`${itemBaseClass} ${indigoItemClass}`}
          >
            <Plus className={indigoIconClass} size={17} strokeWidth={2.25} />
            Feeding
          </Button>
          <Button
            unstyled
            onClick={() => handleSelect('harvest')}
            className={`${itemBaseClass} ${indigoItemClass} rounded-b-lg`}
          >
            <Plus className={indigoIconClass} size={17} strokeWidth={2.25} />
            Harvest
          </Button>
        </div>
      )}
    </div>
  )
}


'use client'
import { LogOut, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface NavbarProps {
  currentUser: User | null
  onMenuClick?: () => void
}

export default function Navbar({ currentUser, onMenuClick }: NavbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Sign out from Supabase - use local scope to avoid 403 errors
      // 'local' scope only removes the session from this device/browser
      await supabase.auth.signOut({ scope: 'local' })

      // Clear any remaining auth data from storage
      if (typeof window !== 'undefined') {
        // Remove all Supabase auth keys from localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Also clear sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      }

      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect to login even if logout fails
      router.push('/login')
    }
  }

  return (
    <nav className="bg-surface dark:bg-surface shadow-lg border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Hamburger menu clicked')
                onMenuClick?.()
              }}
              className="md:hidden p-2 rounded-lg hover:bg-sage-100 dark:hover:bg-slate-800 active:bg-sage-200 dark:active:bg-slate-700 text-text-secondary hover:text-foreground touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Open menu"
              type="button"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-forest-600 dark:text-forest-400 whitespace-nowrap">
              🐝 HiveCraic
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline text-sm text-text-secondary truncate max-w-[150px] lg:max-w-none">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 sm:px-4 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 flex items-center gap-2 touch-manipulation min-h-[48px]"
              aria-label="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
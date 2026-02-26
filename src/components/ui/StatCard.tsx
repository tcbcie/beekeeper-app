import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import AppIcon from '@/components/icons/AppIcon'

type StatCardIcon = LucideIcon | ReactNode

interface StatCardProps {
  label: string
  value: number
  icon: StatCardIcon
  color: string
  href?: string
  className?: string
}

export default function StatCard({ label, value, icon, color, href, className = '' }: StatCardProps) {
  const cardContent = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
      </div>
      <div className={`${color} w-16 h-16 rounded-full flex items-center justify-center`}>
        <AppIcon icon={icon} size="xl" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`block bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border hover:shadow-lg hover:border-forest-500 dark:hover:border-forest-400 transition-all cursor-pointer animate-fade-in-up ${className}`}
      >
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={`bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border animate-fade-in-up ${className}`}>
      {cardContent}
    </div>
  )
}

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type TableTone = 'default' | 'muted'

interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

interface TableSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  tone?: TableTone
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  tone?: TableTone
}

export function TableContainer({ children, className, ...props }: TableContainerProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)} {...props}>
      {children}
    </div>
  )
}

export function TableHeaderRow({ children, className, tone = 'default', ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        tone === 'muted'
          ? 'bg-muted/50 dark:bg-muted/20'
          : 'bg-surface-elevated dark:bg-surface-elevated border-b-2 border-border',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableBody({ children, className, tone = 'default', ...props }: TableSectionProps) {
  return (
    <tbody
      className={cn(
        tone === 'muted'
          ? 'divide-y divide-border'
          : 'bg-surface dark:bg-surface-elevated divide-y divide-border',
        className
      )}
      {...props}
    >
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, tone = 'default', ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        tone === 'muted'
          ? 'hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors'
          : 'hover:bg-surface dark:hover:bg-background',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

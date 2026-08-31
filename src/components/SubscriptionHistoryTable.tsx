'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SubscriptionHistoryItem } from '@/types/subscription'
import { Clock } from 'lucide-react'

export default function SubscriptionHistoryTable() {
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_history')

      if (error) throw error

      setHistory(data as SubscriptionHistoryItem[])
    } catch (error) {
      console.error('Error fetching subscription history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Subscription History</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-secondary rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return null
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-text-secondary" />
            <h3 className="text-lg font-semibold text-foreground">Subscription History</h3>
          </div>
          <span className="text-sm text-text-tertiary">
            {history.length} {history.length === 1 ? 'activation' : 'activations'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-elevated dark:bg-surface-elevated">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Activated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface dark:bg-surface divide-y divide-border">
            {history.map((item) => {
              const isExpired = new Date(item.expires_at) < new Date()
              const isCurrent = item.is_current

              return (
                <tr key={item.id} className={isCurrent ? 'bg-surface-elevated dark:bg-surface-elevated' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.code}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forest-100 dark:bg-forest-900/50 text-forest-800 dark:text-forest-300">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {formatDateTime(item.activated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(item.expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isExpired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-text-secondary">
                        Expired
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-text-secondary">
                        Past
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-surface-elevated dark:bg-surface-elevated border-t border-border">
        <p className="text-sm text-text-tertiary">
          Showing all subscription activations and renewals for your account
        </p>
      </div>
    </div>
  )
}

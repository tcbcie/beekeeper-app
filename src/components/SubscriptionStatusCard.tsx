'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import { Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface SubscriptionStatusCardProps {
  onRenewClick: () => void
}

export default function SubscriptionStatusCard({ onRenewClick }: SubscriptionStatusCardProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')

      if (error) throw error

      setSubscriptionStatus(data as SubscriptionStatusResponse)
    } catch (error) {
      console.error('Error fetching subscription status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!subscriptionStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Failed to load subscription status</p>
      </div>
    )
  }

  const getStatusColor = () => {
    switch (subscriptionStatus.status) {
      case 'active':
        return 'bg-green-50 border-green-200'
      case 'expiring_soon':
        return 'bg-yellow-50 border-yellow-200'
      case 'expiring_very_soon':
        return 'bg-orange-50 border-orange-200'
      case 'expired':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    switch (subscriptionStatus.status) {
      case 'active':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'expiring_soon':
        return <Clock className="w-6 h-6 text-yellow-600" />
      case 'expiring_very_soon':
        return <AlertCircle className="w-6 h-6 text-orange-600" />
      case 'expired':
        return <XCircle className="w-6 h-6 text-red-600" />
      default:
        return <Calendar className="w-6 h-6 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (subscriptionStatus.status) {
      case 'active':
        return 'Active'
      case 'expiring_soon':
        return 'Expiring Soon'
      case 'expiring_very_soon':
        return 'Expires Very Soon!'
      case 'expired':
        return 'Expired'
      default:
        return 'No Subscription'
    }
  }

  const getStatusTextColor = () => {
    switch (subscriptionStatus.status) {
      case 'active':
        return 'text-green-800'
      case 'expiring_soon':
        return 'text-yellow-800'
      case 'expiring_very_soon':
        return 'text-orange-800'
      case 'expired':
        return 'text-red-800'
      default:
        return 'text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getProgressPercentage = () => {
    if (!subscriptionStatus.expires_at) return 0

    const totalDays = 365 // Assuming 1 year subscription
    const remaining = subscriptionStatus.days_remaining
    return Math.max(0, Math.min(100, (remaining / totalDays) * 100))
  }

  const getProgressBarColor = () => {
    const percentage = getProgressPercentage()
    if (percentage > 25) return 'bg-green-600'
    if (percentage > 10) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  return (
    <div className={`rounded-lg border-2 ${getStatusColor()} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
            <p className={`text-sm font-medium ${getStatusTextColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        {subscriptionStatus.status !== 'active' && (
          <button
            onClick={onRenewClick}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            Renew Now
          </button>
        )}
      </div>

      {subscriptionStatus.expires_at && (
        <>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Expires on:</span>
              <span className="font-medium text-gray-900">
                {formatDate(subscriptionStatus.expires_at)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Days remaining:</span>
              <span className={`font-bold ${getStatusTextColor()}`}>
                {subscriptionStatus.days_remaining} days
              </span>
            </div>
            {subscriptionStatus.current_code && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current plan:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {subscriptionStatus.current_code}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </>
      )}

      {subscriptionStatus.status === 'expired' && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Your subscription has expired. Renew now to continue accessing all features.
          </p>
        </div>
      )}

      {subscriptionStatus.status === 'expiring_very_soon' && (
        <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            Your subscription expires in {subscriptionStatus.days_remaining} days. Renew soon to avoid interruption.
          </p>
        </div>
      )}

      {subscriptionStatus.status === 'expiring_soon' && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Your subscription expires in {subscriptionStatus.days_remaining} days. Consider renewing to extend your access.
          </p>
        </div>
      )}

      {subscriptionStatus.status === 'no_subscription' && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-800">
            You don&apos;t have an active subscription. Click &quot;Renew Subscription&quot; above to activate with a code.
          </p>
        </div>
      )}
    </div>
  )
}

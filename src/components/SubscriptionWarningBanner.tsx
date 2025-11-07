'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import { AlertCircle, X, Calendar } from 'lucide-react'

export default function SubscriptionWarningBanner() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

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
    }
  }

  // Don't show banner if dismissed or if subscription is active
  if (dismissed || !subscriptionStatus) return null
  if (subscriptionStatus.status === 'active') return null

  const getBannerColor = () => {
    switch (subscriptionStatus.status) {
      case 'expiring_soon':
        return 'bg-yellow-50 border-yellow-300'
      case 'expiring_very_soon':
        return 'bg-orange-50 border-orange-300'
      case 'expired':
        return 'bg-red-50 border-red-300'
      default:
        return 'bg-gray-50 border-gray-300'
    }
  }

  const getIconColor = () => {
    switch (subscriptionStatus.status) {
      case 'expiring_soon':
        return 'text-yellow-600'
      case 'expiring_very_soon':
        return 'text-orange-600'
      case 'expired':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTextColor = () => {
    switch (subscriptionStatus.status) {
      case 'expiring_soon':
        return 'text-yellow-900'
      case 'expiring_very_soon':
        return 'text-orange-900'
      case 'expired':
        return 'text-red-900'
      default:
        return 'text-gray-900'
    }
  }

  const getMessage = () => {
    switch (subscriptionStatus.status) {
      case 'expiring_soon':
        return `Your subscription expires in ${subscriptionStatus.days_remaining} days. Consider renewing to continue enjoying all features.`
      case 'expiring_very_soon':
        return `Your subscription expires in ${subscriptionStatus.days_remaining} days! Renew now to avoid interruption.`
      case 'expired':
        return 'Your subscription has expired. Renew now to continue using the app.'
      case 'no_subscription':
        return 'You don\'t have an active subscription. Contact an administrator for a subscription code.'
      default:
        return ''
    }
  }

  return (
    <div className={`border-b-2 ${getBannerColor()} px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className={`w-5 h-5 flex-shrink-0 ${getIconColor()}`} />
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {getMessage()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subscriptionStatus.status !== 'no_subscription' && (
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              Renew Now
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className={`p-1 rounded hover:bg-black/5 transition-colors ${getTextColor()}`}
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

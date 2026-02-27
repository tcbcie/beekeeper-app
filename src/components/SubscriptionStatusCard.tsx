'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import { Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

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
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <div className="animate-pulse">
 <div className="h-6 bg-surface-secondary rounded w-1/3 mb-4"></div>
 <div className="h-4 bg-surface-secondary rounded w-2/3"></div>
 </div>
 </div>
 )
 }

 if (!subscriptionStatus) {
 return (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <p className="text-red-600 dark:text-red-400">Failed to load subscription status</p>
 </div>
 )
 }

 const getStatusColor = () => {
 return 'bg-surface dark:bg-surface border-border'
 }

 const getStatusIcon = () => {
 switch (subscriptionStatus.status) {
 case 'active':
 return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
 case 'expiring_soon':
 return <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
 case 'expiring_very_soon':
 return <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
 case 'expired':
 return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
 default:
 return <Calendar className="w-6 h-6 text-text-secondary" />
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
 return 'text-green-800 dark:text-green-300'
 case 'expiring_soon':
 return 'text-yellow-800 dark:text-yellow-300'
 case 'expiring_very_soon':
 return 'text-orange-800 dark:text-orange-300'
 case 'expired':
 return 'text-red-800 dark:text-red-300'
 default:
 return 'text-text-primary'
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
 if (percentage > 25) return 'bg-green-600 dark:bg-green-500'
 if (percentage > 10) return 'bg-yellow-600 dark:bg-yellow-500'
 return 'bg-red-600 dark:bg-red-500'
 }

 return (
 <div className={`rounded-lg border-2 ${getStatusColor()} p-6`}>
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 {getStatusIcon()}
 <div>
 <h3 className="text-lg font-semibold text-foreground">Subscription Status</h3>
 <p className={`text-sm font-medium ${getStatusTextColor()}`}>
 {getStatusText()}
 </p>
 </div>
 </div>
 {subscriptionStatus.status !== 'active' && (
 <Button
 onClick={onRenewClick}
 tone="amber"
 size="sm"
 >
 Renew Now
 </Button>
 )}
 </div>

 {subscriptionStatus.expires_at && (
 <>
 <div className="space-y-3 mb-4">
 <div className="flex justify-between text-sm">
 <span className="text-text-secondary">Expires on:</span>
 <span className="font-medium text-foreground">
 {formatDate(subscriptionStatus.expires_at)}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-text-secondary">Days remaining:</span>
 <span className={`font-bold ${getStatusTextColor()}`}>
 {subscriptionStatus.days_remaining} days
 </span>
 </div>
 {subscriptionStatus.current_code && (
 <div className="flex justify-between text-sm">
 <span className="text-text-secondary">Current plan:</span>
 <span className="font-mono text-xs bg-surface-secondary text-foreground px-2 py-1 rounded">
 {subscriptionStatus.current_code}
 </span>
 </div>
 )}
 </div>

 {/* Progress bar */}
 <div className="mb-4">
 <div className="w-full bg-surface-secondary rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
 style={{ width: `${getProgressPercentage()}%` }}
 ></div>
 </div>
 </div>
 </>
 )}

 {subscriptionStatus.status === 'expired' && (
 <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
 <p className="text-sm text-red-800 dark:text-red-300">
 Your subscription has expired. Renew now to continue accessing all features.
 </p>
 </div>
 )}

 {subscriptionStatus.status === 'expiring_very_soon' && (
 <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
 <p className="text-sm text-orange-800 dark:text-orange-300">
 Your subscription expires in {subscriptionStatus.days_remaining} days. Renew soon to avoid interruption.
 </p>
 </div>
 )}

 {subscriptionStatus.status === 'expiring_soon' && (
 <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
 <p className="text-sm text-yellow-800 dark:text-yellow-300">
 Your subscription expires in {subscriptionStatus.days_remaining} days. Consider renewing to extend your access.
 </p>
 </div>
 )}

 {subscriptionStatus.status === 'no_subscription' && (
 <div className="mt-4 p-3 bg-surface-secondary/80 border border-border rounded-md">
 <p className="text-sm text-foreground ">
 Support the app and the Irish beekeeping community by getting a valid subscription. Click &quot;Renew Subscription&quot; above to activate.
 </p>
 </div>
 )}
 </div>
 )
}

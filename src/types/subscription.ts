// Subscription system TypeScript interfaces

export type SubscriptionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expiring_very_soon'
  | 'expired'
  | 'no_subscription'

export interface SubscriptionStatusResponse {
  is_active: boolean
  status: SubscriptionStatus
  expires_at: string | null
  days_remaining: number
  current_code: string | null
  code_description: string | null
}

export interface SubscriptionHistoryItem {
  id: string
  code: string | null
  activated_at: string
  expires_at: string
  subscription_type: string
  price_paid: number
  is_current: boolean
}

export interface ActivateSubscriptionResponse {
  success: boolean
  message: string
  expires_at?: string
}

export interface SubscriptionBadgeProps {
  status: SubscriptionStatus
  daysRemaining: number
}

export interface SubscriptionProgressProps {
  expiresAt: string
  status: SubscriptionStatus
}

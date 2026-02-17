// Web Push Notification Manager
// Handles push notification subscriptions and persistent notifications

import { supabase } from './supabase'

export interface PushSubscriptionData {
  id?: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  created_at?: string
}

export class PushNotificationManager {
  private vapidPublicKey: string | null = null

  constructor() {
    // VAPID public key should be stored in environment variables
    // For now, we'll generate one - you'll need to add this to your .env
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  // Subscribe to push notifications
  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported')
      return null
    }

    try {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        return null
      }

      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // Subscribe to push notifications
        const options: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          // If you have a VAPID key, include it here
          // applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey!)
        }

        subscription = await registration.pushManager.subscribe(options)
      }

      // Save subscription to database
      await this.saveSubscription(userId, subscription)

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  // Save push subscription to database
  private async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const subscriptionJSON = subscription.toJSON()

    const subscriptionData: PushSubscriptionData = {
      user_id: userId,
      endpoint: subscriptionJSON.endpoint!,
      p256dh_key: subscriptionJSON.keys!.p256dh,
      auth_key: subscriptionJSON.keys!.auth,
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscriptionData.endpoint)
      .maybeSingle()

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update(subscriptionData)
        .eq('id', existing.id)

      if (error) {
        console.error('Failed to update push subscription:', error)
      }
    } else {
      // Insert new subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData)

      if (error) {
        console.error('Failed to save push subscription:', error)
      }
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    if (!this.isSupported()) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)

        if (error) {
          console.error('Failed to remove push subscription from database:', error)
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  // Get current subscription status
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      return await registration.pushManager.getSubscription()
    } catch (error) {
      console.error('Failed to get push subscription:', error)
      return null
    }
  }

  // Helper to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager()

// Listen for background sync messages from service worker
// Guard prevents duplicate listeners on hot reload
let messageListenerRegistered = false
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !messageListenerRegistered) {
  messageListenerRegistered = true
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC') {
      // Trigger sync manager
      const syncEvent = new CustomEvent('background-sync-requested')
      window.dispatchEvent(syncEvent)
    }
  })
}

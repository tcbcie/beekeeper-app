import { supabase } from '@/lib/supabase'

// Push notifications on this phone: reminders that arrive while the app is closed.
// Having a subscription is the opt-in; there is no profile setting. See docs/features/push-notifications.md.

export type PushState =
  | 'unsupported' // this browser cannot receive push
  | 'needs-install' // iPhone/iPad: only works once added to the Home Screen
  | 'blocked' // the person refused notifications for HiveCraic
  | 'off'
  | 'on'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const SIGN_OUT_WAIT_MS = 3000

/** True when HiveCraic runs as an installed app (Home Screen), not in a browser tab. */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isAppleMobile(): boolean {
  const nav = window.navigator
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}

function pushSupported(): boolean {
  return Boolean(PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys?.p256dh,
    p_auth: keys?.auth,
  })
  // Supabase errors are plain objects, not Error instances.
  if (error) throw new Error(error.message)
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported'
  if (isAppleMobile() && !isStandaloneApp()) return 'needs-install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  return (await currentSubscription()) ? 'on' : 'off'
}

/**
 * Makes sure this phone's subscription is saved for the signed-in account. A phone shared by two
 * accounts has one subscription, so whoever is signed in takes it over. Quietly does nothing if off.
 */
export async function refreshPushSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const subscription = await currentSubscription()
  if (subscription) await saveSubscription(subscription)
}

/** Call from a tap only: browsers refuse the permission prompt otherwise. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'

  // getRegistration, not .ready: .ready waits for ever when no worker is registered.
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new Error('No service worker registered')
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY!) }))
  try {
    await saveSubscription(subscription)
  } catch (error) {
    // Not saved means no reminders: don't leave the phone looking switched on.
    await subscription.unsubscribe().catch(() => false)
    throw error
  }
  return 'on'
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const subscription = await currentSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  if (error) throw new Error(error.message)
  await subscription.unsubscribe()
}

/**
 * On a deliberate log-out: stop this phone getting the account's reminders. Never blocks the
 * log-out for long or throws. Unsubscribing on the phone is what matters: if the row cannot be
 * deleted (no signal), the push service rejects the next send and the sender removes it.
 */
export async function removePushOnSignOut(): Promise<void> {
  try {
    if (!pushSupported()) return
    const subscription = await currentSubscription()
    if (!subscription) return
    const deleteRow = supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    let timer: ReturnType<typeof setTimeout> | undefined
    const giveUp = new Promise((resolve) => { timer = setTimeout(resolve, SIGN_OUT_WAIT_MS) })
    await Promise.race([deleteRow, giveUp]).finally(() => clearTimeout(timer))
    await subscription.unsubscribe()
  } catch {
    // Best effort only.
  }
}

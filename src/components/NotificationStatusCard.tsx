'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { Bell, BellOff, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'

type NotificationStatusColor = 'red' | 'green' | 'amber'

interface NotificationStatusInfo {
  icon: ReactNode
  title: string
  description: string
  color: NotificationStatusColor
}

const statusBorderClasses: Record<NotificationStatusColor, string> = {
  red: 'border-red-200 dark:border-red-800',
  green: 'border-green-200 dark:border-green-800',
  amber: 'border-amber-200 dark:border-amber-800'
}

export default function NotificationStatusCard() {
  const toast = useToast()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const getStatusInfo = (): NotificationStatusInfo => {
    if (!isSupported) {
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        title: 'Not Supported',
        description: 'Notifications are not supported in this browser',
        color: 'red'
      }
    }

    switch (permission) {
      case 'granted':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          title: 'Enabled',
          description: 'You will receive browser notifications for important dates',
          color: 'green'
        }
      case 'denied':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          title: 'Blocked',
          description: 'Notifications are blocked. Please enable them in your browser or app settings',
          color: 'red'
        }
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
          title: 'Not Enabled',
          description: 'Enable notifications to get reminders for queen rearing dates',
          color: 'amber'
        }
    }
  }

  const handleOpenSettings = () => {
    // Show helpful instructions based on platform
    const userAgent = navigator.userAgent.toLowerCase()
    let instructions = ''

    if (userAgent.includes('android')) {
      instructions = `
To enable notifications on Android:

1. Long press the HiveCraic app icon
2. Tap 'App info' or 'i' icon
3. Tap 'Notifications'
4. Toggle 'Allow notifications' ON

Or go to:
Settings -> Apps -> HiveCraic -> Notifications
      `.trim()
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      instructions = `
To enable notifications on iOS:

Note: Browser notifications are limited on iOS.
For best results, use the email digest feature instead.
      `.trim()
    } else {
      instructions = `
To enable notifications:

1. Click the lock/info icon in the address bar
2. Find 'Notifications' in the permissions
3. Change to 'Allow'
4. Refresh the page
      `.trim()
    }

    toast.info(instructions, 10000)
  }

  const status = getStatusInfo()

  return (
    <div className={`bg-surface dark:bg-surface rounded-lg border p-4 ${statusBorderClasses[status.color]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {status.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Browser Notifications: {status.title}
          </h3>
          <p className="text-xs text-text-secondary mb-2">
            {status.description}
          </p>
          {permission === 'denied' && (
            <Button
              onClick={handleOpenSettings}
              tone="blue"
              size="xs"
              className="inline-flex items-center gap-1"
            >
              <Settings size={12} />
              How to enable
            </Button>
          )}
        </div>
        <div className="flex-shrink-0">
          {permission === 'granted' ? (
            <Bell className="w-5 h-5 text-green-500" />
          ) : (
            <BellOff className="w-5 h-5 text-text-tertiary" />
          )}
        </div>
      </div>
    </div>
  )
}

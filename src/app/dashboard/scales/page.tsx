'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Scale, Link2, Unlink } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ScalesPage() {
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)

  // BEEP Integration state
  const [beepConnected, setBeepConnected] = useState(false)
  const [beepConnectedAt, setBeepConnectedAt] = useState<string | null>(null)
  const [beepDeviceCount, setBeepDeviceCount] = useState(0)
  const [beepEmail, setBeepEmail] = useState('')
  const [beepPassword, setBeepPassword] = useState('')
  const [connectingBeep, setConnectingBeep] = useState(false)
  const [disconnectingBeep, setDisconnectingBeep] = useState(false)

  // Wolf Waagen Integration state
  const [wolfConnected, setWolfConnected] = useState(false)
  const [wolfConnectedAt, setWolfConnectedAt] = useState<string | null>(null)
  const [wolfScaleCount, setWolfScaleCount] = useState(0)
  const [wolfApiToken, setWolfApiToken] = useState('')
  const [connectingWolf, setConnectingWolf] = useState(false)
  const [disconnectingWolf, setDisconnectingWolf] = useState(false)

  const fetchBeepDeviceCount = useCallback(async () => {
    if (!beepConnected) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/beep/devices', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setBeepDeviceCount(data.devices?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching BEEP devices:', error)
    }
  }, [beepConnected])

  const handleConnectBeep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!beepEmail || !beepPassword) return

    setConnectingBeep(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/beep/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: beepEmail, password: beepPassword }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = 'Connection failed'
        try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
        throw new Error(errorMsg)
      }
      await response.json()

      setBeepConnected(true)
      setBeepConnectedAt(new Date().toISOString())
      setBeepEmail('')
      setBeepPassword('')
      toast.success('BEEP account connected successfully!')
      fetchBeepDeviceCount()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      toast.error(message)
    } finally {
      setConnectingBeep(false)
    }
  }

  const handleDisconnectBeep = async () => {
    if (!confirm('Disconnect your BEEP account? This will remove all scale assignments from your hives.')) return

    setDisconnectingBeep(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/beep/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Disconnect failed')

      setBeepConnected(false)
      setBeepConnectedAt(null)
      setBeepDeviceCount(0)
      toast.success('BEEP account disconnected')
    } catch {
      toast.error('Failed to disconnect BEEP account')
    } finally {
      setDisconnectingBeep(false)
    }
  }

  // Wolf Waagen functions
  const fetchWolfScaleCount = useCallback(async () => {
    if (!wolfConnected) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/wolf-waagen/scales', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWolfScaleCount(data.scales?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching Wolf scales:', error)
    }
  }, [wolfConnected])

  const handleConnectWolf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wolfApiToken) return

    setConnectingWolf(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/wolf-waagen/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiToken: wolfApiToken }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = 'Connection failed'
        try { errorMsg = JSON.parse(text).error || errorMsg } catch {}
        throw new Error(errorMsg)
      }
      const data = await response.json()

      setWolfConnected(true)
      setWolfConnectedAt(new Date().toISOString())
      setWolfScaleCount(data.scaleCount || 0)
      setWolfApiToken('')
      toast.success('Wolf Waagen connected successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      toast.error(message)
    } finally {
      setConnectingWolf(false)
    }
  }

  const handleDisconnectWolf = async () => {
    if (!confirm('Disconnect Wolf Waagen? This will remove all scale assignments from your hives.')) return

    setDisconnectingWolf(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/wolf-waagen/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Disconnect failed')

      setWolfConnected(false)
      setWolfConnectedAt(null)
      setWolfScaleCount(0)
      toast.success('Wolf Waagen disconnected')
    } catch {
      toast.error('Failed to disconnect Wolf Waagen')
    } finally {
      setDisconnectingWolf(false)
    }
  }

  // Init: get user, fetch profile for BEEP/Wolf connection status
  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('beep_api_token, beep_connected_at, wolf_api_token, wolf_connected_at')
          .eq('id', id)
          .maybeSingle()

        if (error) throw error

        if (data) {
          // Check BEEP connection status
          if (data.beep_api_token) {
            setBeepConnected(true)
            setBeepConnectedAt(data.beep_connected_at)
          } else {
            setBeepConnected(false)
            setBeepConnectedAt(null)
          }
          // Check Wolf Waagen connection status
          if (data.wolf_api_token) {
            setWolfConnected(true)
            setWolfConnectedAt(data.wolf_connected_at)
          } else {
            setWolfConnected(false)
            setWolfConnectedAt(null)
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }

      setLoading(false)
    }
    init()
  }, [router])

  // Fetch BEEP device count when connected
  useEffect(() => {
    if (beepConnected) {
      fetchBeepDeviceCount()
    }
  }, [beepConnected, fetchBeepDeviceCount])

  // Fetch Wolf Waagen scale count when connected
  useEffect(() => {
    if (wolfConnected) {
      fetchWolfScaleCount()
    }
  }, [wolfConnected, fetchWolfScaleCount])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Scale size={28} className="text-amber-600" />
        <h1 className="text-2xl font-bold text-foreground">Scales</h1>
      </div>

      {/* BEEP Hive Scale Integration */}
      <div className="bg-surface dark:bg-surface border border-border rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Scale size={24} className="text-amber-600" />
          <h2 className="text-xl font-semibold text-foreground">Hive Scale Integration (BEEP)</h2>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          Connect your BEEP account to display hive scale data (weight, temperature, humidity) on your hive pages.
          Visit <a href="https://app.beep.nl" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">app.beep.nl</a> to create an account.
          Don&apos;t have a scale? <a href="https://beep.nl/index.php/home-english" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Purchase from BEEP</a>.
        </p>

        {beepConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Link2 size={20} className="text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">BEEP Account Connected</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {beepDeviceCount} device{beepDeviceCount !== 1 ? 's' : ''} available
                  {beepConnectedAt && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      (connected {new Date(beepConnectedAt).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleDisconnectBeep}
                disabled={disconnectingBeep}
                className="px-4 py-2 text-sm bg-red-600 dark:bg-red-900/30 text-white dark:text-red-300 rounded-lg hover:bg-red-700 dark:hover:bg-red-900/50 flex items-center gap-2 disabled:opacity-50"
              >
                <Unlink size={16} />
                {disconnectingBeep ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            <p className="text-sm text-text-tertiary">
              To assign a scale to a hive, go to the hive detail page and click &quot;Connect Scale&quot;.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnectBeep} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">BEEP Email</label>
                <input
                  type="email"
                  value={beepEmail}
                  onChange={(e) => setBeepEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">BEEP Password</label>
                <input
                  type="password"
                  value={beepPassword}
                  onChange={(e) => setBeepPassword(e.target.value)}
                  placeholder="Your BEEP password"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={connectingBeep || !beepEmail || !beepPassword}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Link2 size={16} />
              {connectingBeep ? 'Connecting...' : 'Connect BEEP Account'}
            </button>
          </form>
        )}
      </div>

      {/* Wolf Waagen Hive Scale Integration */}
      <div className="bg-surface dark:bg-surface border border-border rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Scale size={24} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-foreground">Hive Scale Integration (Wolf Waagen)</h2>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          Connect your Wolf Waagen ApiGraph scale to display hive data (weight, temperature, humidity) on your hive pages.
          Contact Wolf Waagen support to obtain your API token.
          Don&apos;t have a scale? <a href="https://wolf-waagen.de/en/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Purchase from Wolf Waagen</a>.
        </p>

        {wolfConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Link2 size={20} className="text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">Wolf Waagen Connected</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {wolfScaleCount} scale{wolfScaleCount !== 1 ? 's' : ''} available
                  {wolfConnectedAt && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      (connected {new Date(wolfConnectedAt).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleDisconnectWolf}
                disabled={disconnectingWolf}
                className="px-4 py-2 text-sm bg-red-600 dark:bg-red-900/30 text-white dark:text-red-300 rounded-lg hover:bg-red-700 dark:hover:bg-red-900/50 flex items-center gap-2 disabled:opacity-50"
              >
                <Unlink size={16} />
                {disconnectingWolf ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            <p className="text-sm text-text-tertiary">
              To assign a scale to a hive, go to the hive detail page and click &quot;Connect Wolf Scale&quot;.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnectWolf} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">API Token</label>
              <input
                type="password"
                value={wolfApiToken}
                onChange={(e) => setWolfApiToken(e.target.value)}
                placeholder="Your Wolf Waagen API token"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-text-tertiary mt-1">
                API tokens are provided by Wolf Waagen support for ApiGraph 4.0 and Junior scales.
              </p>
            </div>
            <button
              type="submit"
              disabled={connectingWolf || !wolfApiToken}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Link2 size={16} />
              {connectingWolf ? 'Connecting...' : 'Connect Wolf Waagen'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

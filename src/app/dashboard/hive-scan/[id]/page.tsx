'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, Bug, Syringe, Wheat, Droplet, ArrowLeft } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HiveScanData {
  id: string
  hive_number: string
  apiaries: { name: string } | null
}

export default function HiveScanPage() {
  const params = useParams()
  const hiveId = params.id as string

  const [hive, setHive] = useState<HiveScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHive = useCallback(async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('hives')
        .select('id, hive_number, apiaries(name)')
        .eq('id', hiveId)
        .single()

      if (fetchError || !data) {
        setError('Hive not found. Please check the QR code is valid.')
        return
      }

      const apiaryData = data.apiaries
      setHive({
        id: data.id,
        hive_number: data.hive_number,
        apiaries: Array.isArray(apiaryData) ? apiaryData[0] ?? null : apiaryData,
      })
    } catch {
      setError('Failed to load hive data.')
    } finally {
      setLoading(false)
    }
  }, [hiveId])

  useEffect(() => {
    fetchHive()
  }, [fetchHive])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !hive) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-red-500 mb-4">{error || 'Hive not found.'}</p>
        <Link href="/dashboard/hives" className="text-blue-500 hover:underline">
          Back to Hives
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/hives/${hiveId}`}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-4"
        >
          <ArrowLeft size={20} />
          View Full Hive Details
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Hive {hive.hive_number}</h1>
        {hive.apiaries && (
          <p className="text-text-tertiary mt-1">📍 {hive.apiaries.name}</p>
        )}
      </div>

      {/* Record Type Buttons */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Create a Record</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=inspection`}
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center"
        >
          <Calendar className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">New Inspection</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=varroa-check`}
          className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-center"
        >
          <Bug className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Varroa Check</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=varroa-treatment`}
          className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 text-center"
        >
          <Syringe className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Treatment</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=feeding`}
          className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 text-center"
        >
          <Wheat className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Feeding</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=harvest`}
          className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 text-center"
        >
          <Droplet className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Harvest</div>
        </Link>
      </div>
    </div>
  )
}

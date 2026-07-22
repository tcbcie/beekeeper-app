'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, Bug, Syringe, Wheat, Droplet, ArrowLeft, Tag, ClipboardList, Eye, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface TagData {
  id: string
  code: string
  hive_id: string | null
  mating_nuc_id: string | null
  hive?: {
    id: string
    hive_number: string
    apiaries: { name: string } | null
  }
  mating_nuc?: {
    id: string
    nuc_number: string
    status: string
    equipment_status: string
    mating_location: string | null
  }
}

export default function TagScanPage() {
  const params = useParams()
  const code = params.code as string

  const [tag, setTag] = useState<TagData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTag = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('qr_tags')
        .select('id, code, hive_id, mating_nuc_id')
        .eq('code', code)
        .single()

      if (fetchError || !data) {
        setError('Tag not found. Please check the QR code is valid.')
        return
      }

      if (data.hive_id) {
        const { data: hiveData } = await supabase
          .from('hives')
          .select('id, hive_number, apiaries(name)')
          .eq('id', data.hive_id)
          .single()

        if (hiveData) {
          const apiaryData = hiveData.apiaries
          setTag({
            ...data,
            hive: {
              id: hiveData.id,
              hive_number: hiveData.hive_number,
              apiaries: Array.isArray(apiaryData) ? apiaryData[0] ?? null : apiaryData,
            },
          })
          return
        }
      }

      if (data.mating_nuc_id) {
        const { data: nucData } = await supabase
          .from('mating_nucs')
          .select('id, nuc_number, status, equipment_status, mating_location')
          .eq('id', data.mating_nuc_id)
          .single()

        if (nucData) {
          setTag({
            ...data,
            mating_nuc: {
              id: nucData.id,
              nuc_number: nucData.nuc_number || 'Unnamed',
              status: nucData.status,
              equipment_status: nucData.equipment_status,
              mating_location: nucData.mating_location,
            },
          })
          return
        }
      }

      setTag(data)
    } catch {
      setError('Failed to load tag data.')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    fetchTag()
  }, [fetchTag])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !tag) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-red-500 mb-4">{error || 'Tag not found.'}</p>
        <Link href="/dashboard/hives" className="text-blue-500 hover:underline">
          Back to Hives
        </Link>
      </div>
    )
  }

  if (tag.mating_nuc) {
    const nuc = tag.mating_nuc
    const equipmentLabel = nuc.equipment_status.charAt(0).toUpperCase() + nuc.equipment_status.slice(1)
    const statusLabel = nuc.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    const equipmentColour = nuc.equipment_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : nuc.equipment_status === 'ready' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/dashboard/batches?tab=manage_nucs&nuc=${nuc.id}`}
            className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-4"
          >
            <ArrowLeft size={20} />
            View Full Nuc Details
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Nuc {nuc.nuc_number}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${equipmentColour}`}>
              {equipmentLabel}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {statusLabel}
            </span>
          </div>
          {nuc.mating_location && (
            <p className="text-text-tertiary mt-2 flex items-center gap-1">
              <MapPin size={16} /> {nuc.mating_location}
            </p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/dashboard/batches?tab=manage_nucs&nuc=${nuc.id}`}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center"
          >
            <Eye className="mx-auto mb-2" size={24} />
            <div className="font-medium text-sm">View Details</div>
          </Link>
          <Link
            href={`/dashboard/batches?tab=nucs&nuc_number=${encodeURIComponent(nuc.nuc_number)}`}
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-center"
          >
            <ClipboardList className="mx-auto mb-2" size={24} />
            <div className="font-medium text-sm">New Inspection</div>
          </Link>
        </div>
      </div>
    )
  }

  if (!tag.hive) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <Tag size={48} className="mx-auto mb-4 text-text-tertiary" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Tag {tag.code}</h1>
        <p className="text-text-tertiary mb-6">This tag is not yet assigned to a hive or mating nuc.</p>
        <Link
          href="/dashboard/qr-tags"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Manage QR Tags
        </Link>
      </div>
    )
  }

  const hiveId = tag.hive.id

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
        <h1 className="text-3xl font-bold text-foreground">Hive {tag.hive.hive_number}</h1>
        {tag.hive.apiaries && (
          <p className="text-text-tertiary mt-1">📍 {tag.hive.apiaries.name}</p>
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
          className="bg-orange-700 text-white p-4 rounded-lg hover:bg-orange-800 text-center"
        >
          <Wheat className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Feeding</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=harvest`}
          className="bg-yellow-700 text-white p-4 rounded-lg hover:bg-yellow-800 text-center"
        >
          <Droplet className="mx-auto mb-2" size={24} />
          <div className="font-medium text-sm">Harvest</div>
        </Link>
      </div>
    </div>
  )
}

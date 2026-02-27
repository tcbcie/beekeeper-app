'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Flower2, Droplets, CircleDot, Loader2 } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

interface VegetationInfo {
  scientific_name: string
  bloom_period: string | null
  nectar_value: number | null
  pollen_value: number | null
  honey_characteristics: string | null
  typical_gdd_range: string | null
  description: string | null
}

interface VegetationInfoModalProps {
  isOpen: boolean
  onClose: () => void
  vegetationName: string
  vegetationTypeId: string
}

export default function VegetationInfoModal({
  isOpen,
  onClose,
  vegetationName,
  vegetationTypeId,
}: VegetationInfoModalProps) {
  const [info, setInfo] = useState<VegetationInfo | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setImageUrl(null)
    setImageError(false)
    setInfo(null)

    // Fetch vegetation info from Supabase
    const { data } = await supabase
      .from('vegetation_info')
      .select('scientific_name, bloom_period, nectar_value, pollen_value, honey_characteristics, typical_gdd_range, description')
      .eq('vegetation_type_id', vegetationTypeId)
      .single()

    if (data) {
      setInfo(data)
      // Fetch image from Wikipedia
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(data.scientific_name)}`
        )
        if (res.ok) {
          const wiki = await res.json()
          if (wiki.thumbnail?.source) {
            // Use original image URL for higher resolution
            setImageUrl(wiki.originalimage?.source || wiki.thumbnail.source)
          }
        }
      } catch {
        // Wikipedia fetch failed — image just won't show
      }
    }

    setLoading(false)
  }, [vegetationTypeId])

  useEffect(() => {
    if (isOpen && vegetationTypeId) {
      fetchData()
    }
  }, [isOpen, vegetationTypeId, fetchData])

  if (!isOpen) return null

  const renderStars = (value: number | null, max = 5) => {
    if (!value) return <span className="text-muted">N/A</span>
    return (
      <span className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < value ? 'text-amber-500' : 'text-muted/30'}>&#9733;</span>
        ))}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-surface dark:bg-surface rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-foreground">{vegetationName}</h3>
          </div>
          <IconButton onClick={onClose} size="xs" className="hover:bg-muted/20 text-muted">
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted" />
              <p className="text-sm text-muted">Loading vegetation info...</p>
            </div>
          ) : !info ? (
            <div className="text-center py-12">
              <Flower2 className="w-10 h-10 mx-auto mb-2 text-muted" />
              <p className="text-muted">No information available for this vegetation type.</p>
            </div>
          ) : (
            <>
              {/* Hero Image */}
              {imageUrl && !imageError ? (
                <div className="rounded-lg overflow-hidden bg-muted/10 max-h-56 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={vegetationName}
                    className="w-full h-56 object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : null}

              {/* Scientific Name */}
              <p className="text-sm italic text-muted">{info.scientific_name.replace(/_/g, ' ').replace(/\(.*\)/, '').trim()}</p>

              {/* Ratings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" /> Nectar Value
                  </span>
                  {renderStars(info.nectar_value)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted flex items-center gap-1">
                    <CircleDot className="w-3.5 h-3.5" /> Pollen Value
                  </span>
                  {renderStars(info.pollen_value)}
                </div>
              </div>

              {/* Bloom Period & GDD Range */}
              <div className="grid grid-cols-2 gap-3">
                {info.bloom_period && (
                  <div>
                    <span className="text-xs font-medium text-muted block">Bloom Period</span>
                    <span className="text-sm text-foreground">{info.bloom_period}</span>
                  </div>
                )}
                {info.typical_gdd_range && (
                  <div>
                    <span className="text-xs font-medium text-muted block">GDD Range</span>
                    <span className="text-sm text-foreground">{info.typical_gdd_range}&deg;C</span>
                  </div>
                )}
              </div>

              {/* Honey Characteristics */}
              {info.honey_characteristics && (
                <div>
                  <span className="text-xs font-medium text-muted block mb-1">Honey Characteristics</span>
                  <p className="text-sm text-foreground">{info.honey_characteristics}</p>
                </div>
              )}

              {/* Description */}
              {info.description && (
                <div>
                  <span className="text-xs font-medium text-muted block mb-1">About</span>
                  <p className="text-sm text-foreground">{info.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

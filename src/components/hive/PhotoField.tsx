'use client'

import Image from 'next/image'
import { Camera, Loader2, X } from 'lucide-react'

interface PhotoFieldProps {
  label: string
  /** Data URL of a newly picked file, or the saved photo's URL. */
  preview: string | null
  uploading?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  onEnlarge?: (url: string) => void
  /** Shown under the empty picker, e.g. that the model photo is used otherwise. */
  hint?: string
}

/** One optional photo: a picker when empty, a preview with remove when set. Used by hive models and hives. */
export default function PhotoField({ label, preview, uploading = false, onChange, onRemove, onEnlarge, hint }: PhotoFieldProps) {
  return (
    <div>
      {/* Not a <label>: the picker below is the input's own label */}
      <p className="block text-sm font-medium text-text-secondary mb-2">{label}</p>
      {preview ? (
        <div className="relative w-full max-w-xs">
          <button
            type="button"
            onClick={() => onEnlarge?.(preview)}
            className="relative block w-full h-48"
            aria-label={`Enlarge ${label.toLowerCase()}`}
          >
            <Image
              src={preview}
              alt={label}
              fill
              className="object-cover rounded-lg border border-border"
              unoptimized
            />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 fj-icon-btn fj-icon-btn-danger min-h-[48px] min-w-[48px] bg-surface/90 dark:bg-surface-elevated/90"
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent-primary hover:bg-surface-elevated/70 transition-colors">
          <Camera size={24} className="text-text-tertiary mb-2" />
          <span className="text-sm text-text-secondary">Add a photo</span>
          <span className="text-sm text-text-tertiary mt-1">JPG, PNG, GIF or WebP, up to 10 MB</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onChange} className="hidden" />
        </label>
      )}
      {hint && !preview && <p className="mt-2 text-sm text-text-tertiary">{hint}</p>}
      {uploading && (
        <p className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          Uploading…
        </p>
      )}
    </div>
  )
}

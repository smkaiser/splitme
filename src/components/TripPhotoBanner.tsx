import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

export interface TripPhotoBannerProps {
  tripSlug: string
  photoUpdatedAt: string | null
  canEdit: boolean
  readOnly?: boolean
  onUpload: (file: File) => Promise<unknown>
  onRemove: () => Promise<unknown>
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_BYTES = 5 * 1024 * 1024

export function TripPhotoBanner({
  tripSlug,
  photoUpdatedAt,
  canEdit,
  readOnly,
  onUpload,
  onRemove
}: TripPhotoBannerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)

  const photoUrl = photoUpdatedAt
    ? `/api/trips/${encodeURIComponent(tripSlug)}/photo?v=${encodeURIComponent(photoUpdatedAt)}`
    : null

  const triggerSelect = () => {
    if (readOnly) {
      toast.error('Trip is locked. Unlock to change the photo.')
      return
    }
    inputRef.current?.click()
  }

  const handleFile = async (file: File) => {
    if (!ACCEPTED.split(',').includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image is too large (max 5 MB).')
      return
    }
    setBusy(true)
    try {
      await onUpload(file)
      toast.success('Trip photo updated')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload photo')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (readOnly) {
      toast.error('Trip is locked. Unlock to change the photo.')
      return
    }
    if (!confirm('Remove the trip photo?')) return
    setBusy(true)
    try {
      await onRemove()
      toast.success('Trip photo removed')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove photo')
    } finally {
      setBusy(false)
    }
  }

  if (!photoUrl && !canEdit) return null

  if (!photoUrl) {
    return (
      <div className="mb-6 flex justify-end">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void handleFile(f)
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={triggerSelect}
          disabled={busy}
        >
          <Camera className="w-4 h-4" />
          Add photo
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-6 relative">
      <div className="w-full aspect-[16/6] sm:aspect-[16/5] rounded-lg overflow-hidden bg-muted border">
        <img
          src={photoUrl}
          alt="Trip banner"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {canEdit && (
        <div className="absolute right-2 bottom-2 flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void handleFile(f)
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={triggerSelect}
            disabled={busy}
          >
            <Camera className="w-4 h-4" />
            Change photo
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRemove}
            disabled={busy}
            title="Remove photo"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

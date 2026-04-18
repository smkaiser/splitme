import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LinkSimple, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface ShareTripButtonProps {
  tripSlug: string
}

export function ShareTripButton({ tripSlug }: ShareTripButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/t/${tripSlug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Trip link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      toast.success('Trip link copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? <Check className="w-4 h-4" /> : <LinkSimple className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </Button>
  )
}

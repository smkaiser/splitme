import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus } from '@phosphor-icons/react'
import type { Participant } from '@/types'

interface JoinTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  onJoin: (linkedParticipantId?: string | null) => Promise<void>
}

export function JoinTripDialog({ open, onOpenChange, participants, onJoin }: JoinTripDialogProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>('none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setBusy(true)
    setError(null)
    try {
      const linkedId = selectedParticipant === 'none' ? null : selectedParticipant
      await onJoin(linkedId)
      onOpenChange(false)
      setSelectedParticipant('none')
    } catch (e: any) {
      setError(e.message || 'Failed to join trip')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Join this Trip
          </DialogTitle>
          <DialogDescription>
            Link your account to this trip so it appears in your trip list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {participants.length > 0 && (
            <div className="space-y-2">
              <Label>Which friend are you? (optional)</Label>
              <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Skip — I'll pick later</SelectItem>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps identify which participant is you. You can change this anytime.
              </p>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={busy}>
              {busy ? 'Joining...' : 'Join Trip'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

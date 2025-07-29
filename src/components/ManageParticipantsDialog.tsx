import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Users } from '@phosphor-icons/react'
import { Participant } from '@/App'

interface ManageParticipantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  onUpdateParticipants: (participants: Participant[]) => void
}

export function ManageParticipantsDialog({ 
  open, 
  onOpenChange, 
  participants, 
  onUpdateParticipants 
}: ManageParticipantsDialogProps) {
  const [newParticipantName, setNewParticipantName] = useState('')
  const [error, setError] = useState('')

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault()
    
    const name = newParticipantName.trim()
    if (!name) {
      setError('Name is required')
      return
    }

    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError('This name is already added')
      return
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name
    }

    onUpdateParticipants([...participants, newParticipant])
    setNewParticipantName('')
    setError('')
  }

  const handleRemoveParticipant = (id: string) => {
    onUpdateParticipants(participants.filter(p => p.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Manage Trip Friends</DialogTitle>
          <DialogDescription>
            Add or remove friends who will be sharing expenses
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add new participant */}
          <form onSubmit={handleAddParticipant} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="participant-name">Add Friend</Label>
              <div className="flex gap-2">
                <Input
                  id="participant-name"
                  placeholder="Enter friend's name"
                  value={newParticipantName}
                  onChange={(e) => {
                    setNewParticipantName(e.target.value)
                    setError('')
                  }}
                  className={error ? 'border-destructive' : ''}
                />
                <Button 
                  type="submit"
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </form>

          {/* Current participants */}
          <div className="space-y-3">
            <Label>Current Friends ({participants.length})</Label>
            
            {participants.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No friends added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your trip companions to start tracking expenses
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-4">
                  <div className="space-y-3">
                    {participants.map(participant => (
                      <div 
                        key={participant.id} 
                        className="flex items-center justify-between py-2"
                      >
                        <span className="font-medium">{participant.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
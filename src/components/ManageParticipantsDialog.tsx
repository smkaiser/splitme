import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Users, AlertTriangle } from '@phosphor-icons/react'
import { Participant, Expense } from '@/App'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ManageParticipantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  expenses: Expense[]
  onUpdateParticipants: (participants: Participant[]) => void
  onUpdateExpenses: (expenses: Expense[]) => void
}

export function ManageParticipantsDialog({ 
  open, 
  onOpenChange, 
  participants, 
  expenses,
  onUpdateParticipants,
  onUpdateExpenses
}: ManageParticipantsDialogProps) {
  const [newParticipantName, setNewParticipantName] = useState('')
  const [error, setError] = useState('')
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null)

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

  const getParticipantExpenseInfo = (participantId: string) => {
    const relatedExpenses = expenses.filter(expense => 
      expense.paidBy === participantId || expense.participants.includes(participantId)
    )
    const paidExpenses = expenses.filter(expense => expense.paidBy === participantId)
    const participatedExpenses = expenses.filter(expense => expense.participants.includes(participantId))
    
    return {
      total: relatedExpenses.length,
      paid: paidExpenses.length,
      participated: participatedExpenses.length
    }
  }

  const handleRemoveParticipant = (participant: Participant) => {
    const expenseInfo = getParticipantExpenseInfo(participant.id)
    
    if (expenseInfo.total > 0) {
      setParticipantToRemove(participant)
    } else {
      // No expenses related, safe to remove
      onUpdateParticipants(participants.filter(p => p.id !== participant.id))
    }
  }

  const confirmRemoveParticipant = () => {
    if (!participantToRemove) return

    // Remove participant
    const updatedParticipants = participants.filter(p => p.id !== participantToRemove.id)
    onUpdateParticipants(updatedParticipants)

    // Update expenses: remove participant from participant lists and remove expenses they paid for
    const updatedExpenses = expenses
      .map(expense => ({
        ...expense,
        participants: expense.participants.filter(id => id !== participantToRemove.id)
      }))
      .filter(expense => 
        // Keep expense if someone else paid for it and there are still participants
        expense.paidBy !== participantToRemove.id && expense.participants.length > 0
      )

    onUpdateExpenses(updatedExpenses)
    setParticipantToRemove(null)
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
                    {participants.map(participant => {
                      const expenseInfo = getParticipantExpenseInfo(participant.id)
                      return (
                        <div 
                          key={participant.id} 
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{participant.name}</span>
                            {expenseInfo.total > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {expenseInfo.paid > 0 && `Paid ${expenseInfo.paid} expense${expenseInfo.paid !== 1 ? 's' : ''}`}
                                {expenseInfo.paid > 0 && expenseInfo.participated > expenseInfo.paid && ', '}
                                {expenseInfo.participated > expenseInfo.paid && `Participated in ${expenseInfo.participated - expenseInfo.paid} other${expenseInfo.participated - expenseInfo.paid !== 1 ? 's' : ''}`}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
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

        {/* Confirmation dialog for removing participant with expenses */}
        <AlertDialog open={!!participantToRemove} onOpenChange={() => setParticipantToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Remove {participantToRemove?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This person has expenses associated with them. Removing them will:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Remove them from all expense participant lists</li>
                  <li>Delete any expenses they paid for completely</li>
                  <li>Recalculate all settlements automatically</li>
                </ul>
                <p className="font-medium">
                  This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRemoveParticipant}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Remove Friend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
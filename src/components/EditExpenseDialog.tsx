import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Expense, Participant } from '@/App'

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  participants: Participant[]
  onUpdateExpense: (expense: Expense) => void
}

export function EditExpenseDialog({ open, onOpenChange, expense, participants, onUpdateExpense }: EditExpenseDialogProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      setDescription(expense.description)
      setAmount(expense.amount.toString())
      setDate(expense.date)
      setPlace(expense.place)
      setPaidBy(expense.paidBy)
      setSelectedParticipants(expense.participants)
      setErrors({})
    } else {
      // Reset form
      setDescription('')
      setAmount('')
      setDate('')
      setPlace('')
      setPaidBy('')
      setSelectedParticipants([])
      setErrors({})
    }
  }, [expense])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!description.trim()) {
      newErrors.description = 'Description is required'
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }

    if (!paidBy) {
      newErrors.paidBy = 'Please select who paid'
    }

    // Check if the selected payer still exists
    if (paidBy && !participants.find(p => p.id === paidBy)) {
      newErrors.paidBy = 'Selected payer no longer exists'
    }

    if (selectedParticipants.length === 0) {
      newErrors.participants = 'Please select at least one participant'
    }

    // Filter out participants that no longer exist
    const validParticipants = selectedParticipants.filter(id => 
      participants.find(p => p.id === id)
    )
    if (validParticipants.length !== selectedParticipants.length) {
      setSelectedParticipants(validParticipants)
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!expense || !validateForm()) return

    const updatedExpense: Expense = {
      ...expense,
      description: description.trim(),
      amount: parseFloat(amount),
      date,
      place: place.trim(),
      paidBy,
      participants: selectedParticipants,
    }

    onUpdateExpense(updatedExpense)
    onOpenChange(false)
  }

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants(current => 
      current.includes(participantId)
        ? current.filter(id => id !== participantId)
        : [...current, participantId]
    )
  }

  const handleSelectAll = () => {
    if (selectedParticipants.length === participants.length) {
      setSelectedParticipants([])
    } else {
      setSelectedParticipants(participants.map(p => p.id))
    }
  }

  if (!expense) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update the details of this expense
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Input
              id="edit-description"
              placeholder="Dinner at restaurant, gas, hotel..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`pl-8 ${errors.amount ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-place">Place (optional)</Label>
            <Input
              id="edit-place"
              placeholder="Restaurant name, city, etc."
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Who paid? *</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className={errors.paidBy ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select who paid for this expense" />
              </SelectTrigger>
              <SelectContent>
                {participants.map(participant => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paidBy && (
              <p className="text-sm text-destructive">{errors.paidBy}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Who participated? *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-sm"
              >
                {selectedParticipants.length === participants.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            {participants.length === 0 ? (
              <Card>
                <CardContent className="py-4 text-center text-muted-foreground">
                  No participants available. Add some friends first!
                </CardContent>
              </Card>
            ) : (
              <Card className={errors.participants ? 'border-destructive' : ''}>
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 gap-3">
                    {participants.map(participant => (
                      <div key={participant.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`edit-${participant.id}`}
                          checked={selectedParticipants.includes(participant.id)}
                          onCheckedChange={() => handleParticipantToggle(participant.id)}
                        />
                        <Label 
                          htmlFor={`edit-${participant.id}`}
                          className="font-normal cursor-pointer flex-1"
                        >
                          {participant.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {errors.participants && (
              <p className="text-sm text-destructive">{errors.participants}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={participants.length === 0}
            >
              Update Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
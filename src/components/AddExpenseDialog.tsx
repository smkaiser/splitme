import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Expense, Participant } from '@/App'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  onAddExpense: (expense: Expense) => void
}

export function AddExpenseDialog({ open, onOpenChange, participants, onAddExpense }: AddExpenseDialogProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [place, setPlace] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

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

    if (selectedParticipants.length === 0) {
      newErrors.participants = 'Please select at least one participant'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const expense: Expense = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: parseFloat(amount),
      date,
      place: place.trim(),
      paidBy,
      participants: selectedParticipants,
      createdAt: new Date().toISOString()
    }

    onAddExpense(expense)
    
    // Reset form
    setDescription('')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setPlace('')
    setPaidBy('')
    setSelectedParticipants([])
    setErrors({})
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a shared expense from your trip
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
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
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
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
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="place">Place (optional)</Label>
            <Input
              id="place"
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
                  No participants added yet. Add some friends first!
                </CardContent>
              </Card>
            ) : (
              <Card className={errors.participants ? 'border-destructive' : ''}>
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 gap-3">
                    {participants.map(participant => (
                      <div key={participant.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={participant.id}
                          checked={selectedParticipants.includes(participant.id)}
                          onCheckedChange={() => handleParticipantToggle(participant.id)}
                        />
                        <Label 
                          htmlFor={participant.id}
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
              Add Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import type { Participant } from '@/types'

export interface ExpenseFormValues {
  description: string
  amount: string
  date: string
  place: string
  paidBy: string
  participants: string[]
}

interface ExpenseFormProps {
  participants: Participant[]
  initialValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => void
  onCancel: () => void
  submitLabel: string
  idPrefix?: string
}

export function ExpenseForm({
  participants,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix = '',
}: ExpenseFormProps) {
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [amount, setAmount] = useState(initialValues?.amount ?? '')
  const [date, setDate] = useState(initialValues?.date ?? new Date().toISOString().split('T')[0])
  const [place, setPlace] = useState(initialValues?.place ?? '')
  const [paidBy, setPaidBy] = useState(initialValues?.paidBy ?? '')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(initialValues?.participants ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const prefix = idPrefix ? `${idPrefix}-` : ''

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
    if (!validateForm()) return
    onSubmit({
      description: description.trim(),
      amount,
      date,
      place: place.trim(),
      paidBy,
      participants: selectedParticipants,
    })
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}description`}>Description *</Label>
        <Input
          id={`${prefix}description`}
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
          <Label htmlFor={`${prefix}amount`}>Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id={`${prefix}amount`}
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
          <Label htmlFor={`${prefix}date`}>Date</Label>
          <Input
            id={`${prefix}date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}place`}>Place (optional)</Label>
        <Input
          id={`${prefix}place`}
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
                      id={`${prefix}${participant.id}`}
                      checked={selectedParticipants.includes(participant.id)}
                      onCheckedChange={() => handleParticipantToggle(participant.id)}
                    />
                    <Label
                      htmlFor={`${prefix}${participant.id}`}
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
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={participants.length === 0}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

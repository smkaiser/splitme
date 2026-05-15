import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react'
import type { Participant } from '@/types'

export interface ExpenseFormValues {
  description: string
  amount: string
  date: string
  place: string
  paidBy: string
  participants: string[]
  splits?: Record<string, number> | null
}

interface ExpenseFormProps {
  participants: Participant[]
  initialValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => void
  onCancel: () => void
  submitLabel: string
  idPrefix?: string
}

type SplitMode = '$' | '%'

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
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

  // Advanced split state
  const hasInitialSplits = !!(initialValues?.splits && Object.keys(initialValues.splits).length > 0)
  const [advancedOpen, setAdvancedOpen] = useState(hasInitialSplits)
  const [splitMode, setSplitMode] = useState<SplitMode>('$')
  const [splitAmounts, setSplitAmounts] = useState<Record<string, number>>(() => {
    if (hasInitialSplits) return { ...initialValues!.splits! }
    return {}
  })
  // Track which fields the user has manually edited
  const [manuallyEdited, setManuallyEdited] = useState<Set<string>>(() => {
    if (hasInitialSplits) return new Set(Object.keys(initialValues!.splits!))
    return new Set()
  })

  const prefix = idPrefix ? `${idPrefix}-` : ''
  const totalAmount = parseFloat(amount) || 0

  const participantMap = useMemo(
    () => new Map(participants.map(p => [p.id, p])),
    [participants]
  )

  // Recompute auto-filled values for unedited participants
  const computedSplits = useMemo(() => {
    if (!advancedOpen || selectedParticipants.length === 0) return splitAmounts

    const edited = new Map<string, number>()
    const unedited: string[] = []

    for (const pid of selectedParticipants) {
      if (manuallyEdited.has(pid) && pid in splitAmounts) {
        edited.set(pid, splitAmounts[pid])
      } else {
        unedited.push(pid)
      }
    }

    const editedSum = Array.from(edited.values()).reduce((s, v) => s + v, 0)
    const remaining = Math.max(0, totalAmount - editedSum)
    const perPerson = unedited.length > 0 ? roundCents(remaining / unedited.length) : 0

    const result: Record<string, number> = {}
    for (const [pid, val] of edited) {
      result[pid] = val
    }

    // Distribute remainder evenly, fixing rounding on the last person
    let distributed = 0
    for (let i = 0; i < unedited.length; i++) {
      if (i === unedited.length - 1) {
        result[unedited[i]] = roundCents(remaining - distributed)
      } else {
        result[unedited[i]] = perPerson
        distributed += perPerson
      }
    }

    return result
  }, [advancedOpen, selectedParticipants, splitAmounts, manuallyEdited, totalAmount])

  const splitsTotal = useMemo(
    () => roundCents(Object.values(computedSplits).reduce((s, v) => s + v, 0)),
    [computedSplits]
  )

  const splitsValid = Math.abs(splitsTotal - totalAmount) < 0.02

  const handleSplitValueChange = useCallback((participantId: string, rawValue: string) => {
    const num = parseFloat(rawValue)
    if (rawValue === '' || isNaN(num)) {
      // Clear this participant — treat as unedited
      setManuallyEdited(prev => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
      setSplitAmounts(prev => {
        const next = { ...prev }
        delete next[participantId]
        return next
      })
      return
    }

    const dollarValue = splitMode === '%' ? roundCents((num / 100) * totalAmount) : roundCents(num)

    setManuallyEdited(prev => new Set(prev).add(participantId))
    setSplitAmounts(prev => ({ ...prev, [participantId]: dollarValue }))
  }, [splitMode, totalAmount])

  const getDisplayValue = useCallback((participantId: string): string => {
    const dollars = computedSplits[participantId]
    if (dollars === undefined) return ''
    if (splitMode === '%') {
      return totalAmount > 0 ? roundCents((dollars / totalAmount) * 100).toString() : '0'
    }
    return dollars.toString()
  }, [computedSplits, splitMode, totalAmount])

  // When amount changes, clamp manually-edited values that exceed the new total
  const handleAmountChange = useCallback((newAmount: string) => {
    setAmount(newAmount)
    const newTotal = parseFloat(newAmount) || 0
    if (advancedOpen && newTotal > 0) {
      setSplitAmounts(prev => {
        const next = { ...prev }
        for (const pid of Object.keys(next)) {
          if (next[pid] > newTotal) {
            next[pid] = newTotal
          }
        }
        return next
      })
    }
  }, [advancedOpen])

  const handleParticipantToggle = useCallback((participantId: string) => {
    setSelectedParticipants(current => {
      const isRemoving = current.includes(participantId)
      const next = isRemoving
        ? current.filter(id => id !== participantId)
        : [...current, participantId]

      if (isRemoving) {
        // Clean up split data for removed participant
        setSplitAmounts(prev => {
          const updated = { ...prev }
          delete updated[participantId]
          return updated
        })
        setManuallyEdited(prev => {
          const updated = new Set(prev)
          updated.delete(participantId)
          return updated
        })
      }

      return next
    })
  }, [])

  const handleSelectAll = () => {
    if (selectedParticipants.length === participants.length) {
      setSelectedParticipants([])
      if (advancedOpen) {
        setSplitAmounts({})
        setManuallyEdited(new Set())
      }
    } else {
      setSelectedParticipants(participants.map(p => p.id))
    }
  }

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

    if (advancedOpen && !splitsValid) {
      newErrors.splits = `Split amounts must equal $${totalAmount.toFixed(2)} (currently $${splitsTotal.toFixed(2)})`
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
      splits: advancedOpen ? computedSplits : null,
    })
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
              onChange={(e) => handleAmountChange(e.target.value)}
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

      {/* Advanced split toggle */}
      <button
        type="button"
        onClick={() => setAdvancedOpen(prev => !prev)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {advancedOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
        Custom split
      </button>

      {/* Advanced split section */}
      {advancedOpen && (
        <div className="space-y-3">
          {/* $ / % toggle */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSplitMode('$')}
              className={`px-2.5 py-1 text-xs rounded-l-md border transition-colors ${
                splitMode === '$'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              $
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('%')}
              className={`px-2.5 py-1 text-xs rounded-r-md border border-l-0 transition-colors ${
                splitMode === '%'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              %
            </button>
          </div>

          {selectedParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Select participants above to configure splits.</p>
          ) : (
            <Card>
              <CardContent className="py-3 space-y-2">
                {selectedParticipants.map(pid => {
                  const participant = participantMap.get(pid)
                  if (!participant) return null
                  return (
                    <div key={pid} className="flex items-center gap-3">
                      <Label className="font-normal text-sm flex-1 min-w-0 truncate">
                        {participant.name}
                      </Label>
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                          {splitMode === '$' ? '$' : '%'}
                        </span>
                        <Input
                          type="number"
                          step={splitMode === '$' ? '0.01' : '1'}
                          min="0"
                          max={splitMode === '%' ? '100' : undefined}
                          placeholder="0.00"
                          value={getDisplayValue(pid)}
                          onChange={(e) => handleSplitValueChange(pid, e.target.value)}
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Summary line */}
          {selectedParticipants.length > 0 && totalAmount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              {splitsValid ? (
                <>
                  <Check size={14} className="text-green-600" weight="bold" />
                  <span className="text-green-600">Splits match total</span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Remaining: <span className={Math.abs(totalAmount - splitsTotal) > 0.01 ? 'text-destructive font-medium' : ''}>
                    ${roundCents(totalAmount - splitsTotal).toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          )}

          {errors.splits && (
            <p className="text-sm text-destructive">{errors.splits}</p>
          )}
        </div>
      )}

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

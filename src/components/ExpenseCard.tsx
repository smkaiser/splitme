import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PencilSimple, Trash, MapPin, Calendar } from '@phosphor-icons/react'
import { Expense, Participant } from '@/App'

interface ExpenseCardProps {
  expense: Expense
  participants: Participant[]
  onEdit: () => void
  onDelete: (id: string) => void
}

export function ExpenseCard({ expense, participants, onEdit, onDelete }: ExpenseCardProps) {
  const payer = participants.find(p => p.id === expense.paidBy)
  const expenseParticipants = participants.filter(p => expense.participants.includes(p.id))
  const amountPerPerson = expense.amount / expense.participants.length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-us', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-1">
              {expense.description}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(expense.date)}
              </div>
              {expense.place && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {expense.place}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ${expense.amount.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              ${amountPerPerson.toFixed(2)} per person
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Paid by {payer?.name || 'Unknown'}
            </p>
            <div className="flex flex-wrap gap-2">
              {expenseParticipants.map(participant => (
                <Badge 
                  key={participant.id} 
                  variant="secondary"
                  className="bg-secondary/50"
                >
                  {participant.name}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Split between {expense.participants.length} {expense.participants.length === 1 ? 'person' : 'people'}
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0"
                  >
                    <PencilSimple className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit expense</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(expense.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete expense</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
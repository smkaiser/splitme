import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Expense, Participant } from '@/App'
import { ExpenseForm, ExpenseFormValues } from '@/components/ExpenseForm'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  onAddExpense: (expense: Expense) => void
}

export function AddExpenseDialog({ open, onOpenChange, participants, onAddExpense }: AddExpenseDialogProps) {
  const handleSubmit = (values: ExpenseFormValues) => {
    const expense: Expense = {
      id: Date.now().toString(),
      description: values.description,
      amount: parseFloat(values.amount),
      date: values.date,
      place: values.place,
      paidBy: values.paidBy,
      participants: values.participants,
      createdAt: new Date().toISOString()
    }

    onAddExpense(expense)
    onOpenChange(false)
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

        {/* key forces a fresh form each time the dialog opens */}
        <ExpenseForm
          key={open ? 'open' : 'closed'}
          participants={participants}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Expense"
        />
      </DialogContent>
    </Dialog>
  )
}
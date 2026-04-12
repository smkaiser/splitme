import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Expense, Participant } from '@/types'
import { ExpenseForm, ExpenseFormValues } from '@/components/ExpenseForm'

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  participants: Participant[]
  onUpdateExpense: (expense: Expense) => void
}

export function EditExpenseDialog({ open, onOpenChange, expense, participants, onUpdateExpense }: EditExpenseDialogProps) {
  if (!expense) return null

  const handleSubmit = (values: ExpenseFormValues) => {
    const updatedExpense: Expense = {
      ...expense,
      description: values.description,
      amount: parseFloat(values.amount),
      date: values.date,
      place: values.place,
      paidBy: values.paidBy,
      participants: values.participants,
    }

    onUpdateExpense(updatedExpense)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update the details of this expense
          </DialogDescription>
        </DialogHeader>

        {/* key={expense.id} forces a remount when switching between expenses */}
        <ExpenseForm
          key={expense.id}
          participants={participants}
          initialValues={{
            description: expense.description,
            amount: expense.amount.toString(),
            date: expense.date,
            place: expense.place,
            paidBy: expense.paidBy,
            participants: expense.participants,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Update Expense"
          idPrefix="edit"
        />
      </DialogContent>
    </Dialog>
  )
}
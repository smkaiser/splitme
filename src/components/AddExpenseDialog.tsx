import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Expense, Participant } from '@/types'
import { ExpenseForm, ExpenseFormValues } from '@/components/ExpenseForm'
import type { ReceiptAnalysis } from '@/hooks/useTripRemote'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  onAddExpense: (expense: Expense) => void
  canScanReceipt: boolean
  onAnalyzeReceipt: (file: File) => Promise<ReceiptAnalysis>
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  participants,
  onAddExpense,
  canScanReceipt,
  onAnalyzeReceipt
}: AddExpenseDialogProps) {
  const handleSubmit = (values: ExpenseFormValues) => {
    const expense: Expense = {
      id: Date.now().toString(),
      description: values.description,
      amount: parseFloat(values.amount),
      date: values.date,
      place: values.place,
      paidBy: values.paidBy,
      participants: values.participants,
      splits: values.splits ?? null,
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
          canScanReceipt={canScanReceipt}
          onAnalyzeReceipt={onAnalyzeReceipt}
        />
      </DialogContent>
    </Dialog>
  )
}
import { Expense, Participant } from '@/App'

export interface Settlement {
  from: string
  to: string
  amount: number
}

export function calculateSettlements(expenses: Expense[], participants: Participant[]): Settlement[] {
  if (expenses.length === 0 || participants.length === 0) return []

  // Create a map of participant balances (positive = owed money, negative = owes money)
  const balances = new Map<string, number>()
  
  // Initialize all participants with 0 balance
  participants.forEach(p => balances.set(p.id, 0))

  // Calculate each person's balance
  expenses.forEach(expense => {
    const participantCount = expense.participants.length
    const amountPerPerson = expense.amount / participantCount

    // The person who paid gets credited
    const currentPaidBalance = balances.get(expense.paidBy) || 0
    balances.set(expense.paidBy, currentPaidBalance + expense.amount)

    // Each participant (including payer) gets debited their share
    expense.participants.forEach(participantId => {
      const currentBalance = balances.get(participantId) || 0
      balances.set(participantId, currentBalance - amountPerPerson)
    })
  })

  // Convert balances to settlements
  const settlements: Settlement[] = []
  const creditors: Array<{ id: string, amount: number }> = []
  const debtors: Array<{ id: string, amount: number }> = []

  // Separate creditors (positive balance) and debtors (negative balance)
  balances.forEach((balance, participantId) => {
    if (balance > 0.01) { // Small threshold to handle floating point precision
      creditors.push({ id: participantId, amount: balance })
    } else if (balance < -0.01) {
      debtors.push({ id: participantId, amount: -balance })
    }
  })

  // Create settlements by matching debtors to creditors
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]

    const settlementAmount = Math.min(creditor.amount, debtor.amount)

    if (settlementAmount > 0.01) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: settlementAmount
      })
    }

    creditor.amount -= settlementAmount
    debtor.amount -= settlementAmount

    if (creditor.amount <= 0.01) creditorIndex++
    if (debtor.amount <= 0.01) debtorIndex++
  }

  return settlements
}
import type { Expense, Participant } from '@/App'

export interface CSVExportOptions {
  includeSettlements?: boolean
}

export function exportExpensesToCSV(
  expenses: Expense[], 
  participants: Participant[], 
  options: CSVExportOptions = {}
): void {
  // Create expenses CSV data
  const expenseHeaders = [
    'Date',
    'Place',
    'Amount',
    'Description',
    'Paid By',
    'Participants',
    'Amount Per Person',
    'Created At'
  ]

  const expenseRows = expenses.map(expense => {
    const paidByName = participants.find(p => p.id === expense.paidBy)?.name || 'Unknown'
    const participantNames = expense.participants
      .map(id => participants.find(p => p.id === id)?.name || 'Unknown')
      .join('; ')
    const amountPerPerson = expense.amount / expense.participants.length

    return [
      expense.date,
      expense.place,
      expense.amount.toFixed(2),
      expense.description,
      paidByName,
      participantNames,
      amountPerPerson.toFixed(2),
      new Date(expense.createdAt).toLocaleString()
    ]
  })

  // Convert to CSV format
  const csvContent = [
    expenseHeaders.join(','),
    ...expenseRows.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `splitme-expenses-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export function exportSettlementsToCSV(
  settlements: Array<{ from: string; to: string; amount: number }>,
  participants: Participant[]
): void {
  const headers = ['From', 'To', 'Amount']
  
  const rows = settlements.map(settlement => [
    participants.find(p => p.id === settlement.from)?.name || settlement.from,
    participants.find(p => p.id === settlement.to)?.name || settlement.to,
    settlement.amount.toFixed(2)
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `splitme-settlements-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}
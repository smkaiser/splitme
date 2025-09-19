import type { Expense, Participant } from '@/App'
import { toast } from 'sonner'

export interface CSVExportOptions {
  includeSettlements?: boolean
  tripSlug?: string
}

export function exportExpensesToCSV(
  expenses: Expense[], 
  participants: Participant[], 
  options: CSVExportOptions = {}
): void {
  try {
    console.log('Starting CSV export...', { expenseCount: expenses.length, participantCount: participants.length })
    
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
    console.log('Creating CSV content...', csvContent.substring(0, 200) + '...')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
  const date = new Date().toISOString().split('T')[0]
  const filename = options.tripSlug ? `splitme-${options.tripSlug}-expenses-${date}.csv` : `splitme-expenses-${date}.csv`
    console.log('Creating download with filename:', filename)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    console.log('CSV export completed successfully')
    toast.success(`Expenses exported to ${filename}`)
  } catch (error) {
    console.error('Error exporting CSV:', error)
    toast.error('Failed to export CSV. Please try again.')
  }
}

export function exportSettlementsToCSV(
  settlements: Array<{ from: string; to: string; amount: number }>,
  participants: Participant[],
  options: { tripSlug?: string } = {}
): void {
  try {
    console.log('Starting settlements CSV export...', { settlementCount: settlements.length })
    
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
    
  const date = new Date().toISOString().split('T')[0]
  const filename = options.tripSlug ? `splitme-${options.tripSlug}-settlements-${date}.csv` : `splitme-settlements-${date}.csv`
    console.log('Creating settlements download with filename:', filename)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    console.log('Settlements CSV export completed successfully')
    toast.success(`Settlements exported to ${filename}`)
  } catch (error) {
    console.error('Error exporting settlements CSV:', error)
    toast.error('Failed to export settlements CSV. Please try again.')
  }
}
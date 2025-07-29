import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Receipt, Users, Calculator, Trash2, Edit } from '@phosphor-icons/react'
import { AddExpenseDialog } from '@/components/AddExpenseDialog'
import { EditExpenseDialog } from '@/components/EditExpenseDialog'
import { ManageParticipantsDialog } from '@/components/ManageParticipantsDialog'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SettlementCard } from '@/components/SettlementCard'
import { calculateSettlements } from '@/lib/settlements'

export interface Participant {
  id: string
  name: string
}

export interface Expense {
  id: string
  date: string
  place: string
  amount: number
  description: string
  paidBy: string
  participants: string[]
  createdAt: string
}

function App() {
  const [participants, setParticipants] = useKV<Participant[]>('participants', [])
  const [expenses, setExpenses] = useKV<Expense[]>('expenses', [])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showEditExpense, setShowEditExpense] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const [showManageParticipants, setShowManageParticipants] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses')

  const settlements = calculateSettlements(expenses, participants)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense)
    setShowEditExpense(true)
  }

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses((current) => 
      current.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">TripSplit</h1>
          <p className="text-muted-foreground text-lg">Split expenses with friends, effortlessly</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">${totalExpenses.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{expenses.length}</div>
              <p className="text-sm text-muted-foreground">Expenses Recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{participants.length}</div>
              <p className="text-sm text-muted-foreground">Trip Friends</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            onClick={() => setShowAddExpense(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Expense
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowManageParticipants(true)}
            size="lg"
          >
            <Users className="w-5 h-5 mr-2" />
            Manage Friends
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'expenses' ? 'default' : 'outline'}
            onClick={() => setActiveTab('expenses')}
            className="flex-1 md:flex-none"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Expenses
          </Button>
          <Button
            variant={activeTab === 'settlements' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settlements')}
            className="flex-1 md:flex-none"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Settlements
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first shared expense from your trip
                  </p>
                  <Button 
                    onClick={() => setShowAddExpense(true)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              expenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    participants={participants}
                    onEdit={() => handleEditExpense(expense)}
                    onDelete={(id) => {
                      setExpenses((current) => current.filter(e => e.id !== id))
                    }}
                  />
                ))
            )}
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="space-y-4">
            {settlements.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All settled up!</h3>
                  <p className="text-muted-foreground">
                    {expenses.length === 0 
                      ? "Add some expenses to see settlement calculations"
                      : "Everyone's expenses are balanced"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              settlements.map((settlement, index) => (
                <SettlementCard key={index} settlement={settlement} />
              ))
            )}
          </div>
        )}

        {/* Dialogs */}
        <AddExpenseDialog
          open={showAddExpense}
          onOpenChange={setShowAddExpense}
          participants={participants}
          onAddExpense={(expense) => {
            setExpenses((current) => [...current, expense])
          }}
        />

        <EditExpenseDialog
          open={showEditExpense}
          onOpenChange={setShowEditExpense}
          expense={expenseToEdit}
          participants={participants}
          onUpdateExpense={handleUpdateExpense}
        />

        <ManageParticipantsDialog
          open={showManageParticipants}
          onOpenChange={setShowManageParticipants}
          participants={participants}
          expenses={expenses}
          onUpdateParticipants={setParticipants}
          onUpdateExpenses={setExpenses}
        />
      </div>
    </div>
  )
}

export default App
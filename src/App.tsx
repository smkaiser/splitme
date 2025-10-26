import { useState } from 'react'
// Remote data hook replaces local KV storage
import { useTripRemote } from './hooks/useTripRemote'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster, toast } from 'sonner'
import { PlusIcon, ReceiptIcon, UsersIcon, CalculatorIcon, DownloadIcon, GridNineIcon, LockSimple, LockSimpleOpen } from '@phosphor-icons/react'
import { AddExpenseDialog } from '@/components/AddExpenseDialog'
import { EditExpenseDialog } from '@/components/EditExpenseDialog'
import { ManageParticipantsDialog } from '@/components/ManageParticipantsDialog'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SettlementCard } from '@/components/SettlementCard'
import { ImportSpreadsheetDialog } from '@/components/ImportSpreadsheetDialog'
import { calculateSettlements } from '@/lib/settlements'
import { exportExpensesToCSV, exportSettlementsToCSV } from '@/lib/csv-export'
import { AUTH_PROVIDERS, useAuth } from './hooks/useAuth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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

interface AppProps { tripSlug: string; tripName?: string }

function App({ tripSlug, tripName }: AppProps) {
  const {
    participants,
    expenses,
    loading,
    error,
    createParticipant,
    deleteParticipant,
    createExpense,
    updateExpense,
    deleteExpense,
    locked,
    ownerId,
    ownerName,
    toggleLock,
    tripName: remoteTripName
  } = useTripRemote({ tripSlug })
  const { user, loading: authLoading, login, logout } = useAuth()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showEditExpense, setShowEditExpense] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)
  const [showManageParticipants, setShowManageParticipants] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses')
  const [isExporting, setIsExporting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)

  const displayTripName = remoteTripName || tripName
  const isOwner = Boolean(user && ownerId && user.id === ownerId)

  const readOnly = Boolean(locked)
  const settlements = calculateSettlements(expenses || [], participants || [])
  const totalExpenses = (expenses || []).reduce((sum, expense) => sum + expense.amount, 0)

  const handleEditExpense = (expense: Expense) => {
    if (readOnly) {
      toast.error('Trip is locked. Unlock to edit expenses.')
      return
    }
    setExpenseToEdit(expense)
    setShowEditExpense(true)
  }

  const handleExportExpenses = async () => {
    setIsExporting(true)
    try {
  exportExpensesToCSV(expenses || [], participants || [], { tripSlug })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSettlements = async () => {
    setIsExporting(true)
    try {
  exportSettlementsToCSV(settlements, participants || [], { tripSlug })
    } finally {
      setIsExporting(false)
    }
  }

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    try {
      await updateExpense(updatedExpense.id, {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        date: updatedExpense.date,
        place: updatedExpense.place,
        paidBy: updatedExpense.paidBy,
        participants: updatedExpense.participants
      })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update expense')
    }
  }

  const handleProviderLogin = (providerId: string) => {
    login(providerId, window.location.href)
  }

  const handleToggleLock = async () => {
    if (!isOwner) return
    setLockBusy(true)
    try {
      const nextLocked = !readOnly
      await toggleLock(nextLocked)
      toast.success(nextLocked ? 'Trip locked' : 'Trip unlocked')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update lock state')
    } finally {
      setLockBusy(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-end items-center gap-3 mb-4">
          {authLoading ? (
            <span className="text-sm text-muted-foreground">Checking account…</span>
          ) : user ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Signed in as {user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout(window.location.href)}>Sign out</Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Sign in</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {AUTH_PROVIDERS.map(provider => (
                  <DropdownMenuItem key={provider.id} onClick={() => handleProviderLogin(provider.id)}>
                    {provider.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => { window.location.href = '/' }}>
                  More options…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{displayTripName || 'Trip'} • SplitMe</h1>
          <div className="flex flex-wrap items-center gap-3 justify-center mb-2">
            <Badge variant={readOnly ? 'destructive' : 'secondary'}>
              {readOnly ? 'Locked (read-only)' : 'Unlocked'}
            </Badge>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleLock}
                disabled={lockBusy}
                className="gap-2"
              >
                {readOnly ? <LockSimpleOpen className="w-4 h-4" /> : <LockSimple className="w-4 h-4" />}
                {lockBusy ? 'Updating…' : readOnly ? 'Unlock trip' : 'Lock trip'}
              </Button>
            )}
          </div>
          {readOnly && !isOwner && ownerName && (
            <p className="text-sm text-muted-foreground mb-1">Locked by {ownerName}</p>
          )}
          <p className="text-muted-foreground text-lg">Trip URL /t/{tripSlug} · <button className="underline hover:no-underline" onClick={() => { window.location.href='/' }}>All Trips</button></p>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          {loading && <p className="text-sm text-muted-foreground mt-2">Loading trip data...</p>}
        </div>

        {/* Quick Stats (condensed on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-8">
          <Card>
            <CardContent className="py-3 sm:py-5">
              <div className="text-xl sm:text-2xl font-bold text-primary">${totalExpenses.toFixed(2)}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 sm:py-5">
              <div className="text-xl sm:text-2xl font-bold text-primary">{(expenses || []).length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Expenses Recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 sm:py-5">
              <div className="text-xl sm:text-2xl font-bold text-primary">{(participants || []).length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Trip Friends</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => {
              if (readOnly) {
                toast.error('Trip is locked. Unlock to add expenses.')
                return
              }
              setShowAddExpense(true)
            }}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
            
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Expense
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (readOnly) {
                toast.error('Trip is locked. Unlock to import data.')
                return
              }
              setShowImport(true)
            }}
            size="lg"
          >
            <GridNineIcon className="w-5 h-5 mr-2" />
            Import Spreadsheet
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (readOnly) {
                toast.error('Trip is locked. Unlock to manage friends.')
                return
              }
              setShowManageParticipants(true)
            }}
            size="lg"
            
          >
            <UsersIcon className="w-5 h-5 mr-2" />
            Manage Friends
          </Button>
          {(expenses || []).length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleExportExpenses}
              disabled={isExporting}
              size="lg"
            >
              <DownloadIcon className="w-5 h-5 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'expenses' ? 'default' : 'outline'}
            onClick={() => setActiveTab('expenses')}
            className="flex-1 md:flex-none"
          >
            <ReceiptIcon className="w-4 h-4 mr-2" />
            Expenses
          </Button>
          <Button
            variant={activeTab === 'settlements' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settlements')}
            className="flex-1 md:flex-none"
          >
            <CalculatorIcon className="w-4 h-4 mr-2" />
            Settlements
          </Button>
          
          {/* Tab-specific export buttons */}
          {activeTab === 'settlements' && settlements.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportSettlements}
              disabled={isExporting}
              className="ml-auto"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Settlements'}
            </Button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {(expenses || []).length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <ReceiptIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first shared expense from your trip
                  </p>
                  <Button 
                    onClick={() => {
                      if (readOnly) {
                        toast.error('Trip is locked. Unlock to add expenses.')
                        return
                      }
                      setShowAddExpense(true)
                    }}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add First Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              (expenses || [])
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    participants={participants || []}
                    onEdit={() => handleEditExpense(expense)}
                    onDelete={async (id) => {
                      if (readOnly) {
                        toast.error('Trip is locked. Unlock to delete expenses.')
                        return
                      }
                      try {
                        await deleteExpense(id)
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to delete expense')
                      }
                    }}
                    readOnly={readOnly}
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
                  <CalculatorIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All settled up!</h3>
                  <p className="text-muted-foreground">
                    {(expenses || []).length === 0 
                      ? "Add some expenses to see settlement calculations"
                      : "Everyone's expenses are balanced"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              settlements.map((settlement, index) => (
                <SettlementCard key={index} settlement={settlement} participants={participants || []} />
              ))
            )}
          </div>
        )}

        {/* Dialogs */}
        <AddExpenseDialog
          open={showAddExpense}
          onOpenChange={setShowAddExpense}
          participants={participants || []}
          onAddExpense={async (expense) => {
            // Create expense remotely (ignore local id fields, server returns canonical object)
            try {
              await createExpense({
                amount: expense.amount,
                date: expense.date,
                place: expense.place,
                description: expense.description,
                paidBy: expense.paidBy,
                participants: expense.participants
              })
            } catch (e: any) {
              toast.error(e?.message || 'Failed to add expense')
            }
          }}
        />

        <EditExpenseDialog
          open={showEditExpense}
          onOpenChange={setShowEditExpense}
          expense={expenseToEdit}
          participants={participants || []}
          onUpdateExpense={handleUpdateExpense}
        />

        <ManageParticipantsDialog
          open={showManageParticipants}
          onOpenChange={setShowManageParticipants}
          participants={participants || []}
          expenses={expenses || []}
          remoteCreate={async (name: string) => {
            try {
              await createParticipant(name)
            } catch (e: any) {
              toast.error(e?.message || 'Failed to add friend')
              throw e
            }
          }}
          remoteDelete={async (participant, updatedExpenses) => {
            // Update each affected expense first (remove participant references)
            const existingMap = new Map((expenses || []).map(e => [e.id, e]))
            for (const updated of updatedExpenses) {
              const orig = existingMap.get(updated.id)
              if (orig && (orig.participants.join(',') !== updated.participants.join(',') || orig.paidBy !== updated.paidBy)) {
                try {
                  await updateExpense(updated.id, {
                    participants: updated.participants,
                    paidBy: updated.paidBy
                  })
                } catch (e: any) {
                  toast.error(e?.message || 'Failed to update expense')
                  throw e
                }
              }
            }
            try {
              await deleteParticipant(participant.id)
            } catch (e: any) {
              toast.error(e?.message || 'Failed to remove friend')
              throw e
            }
          }}
        />
        <ImportSpreadsheetDialog
          open={showImport}
          onOpenChange={setShowImport}
          tripSlug={tripSlug}
          participants={participants || []}
          onImported={() => { /* refresh already implicit via createExpense which mutates state */ }}
          createExpense={async ({ amount, date, place, description, paidBy, participants }) => {
            try {
              await createExpense({ amount, date, place, description, paidBy, participants })
            } catch (e: any) {
              toast.error(e?.message || 'Failed to add imported expense')
              throw e
            }
          }}
        />
        </div>
      </div>
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}

export default App
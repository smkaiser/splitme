import { useEffect, useState, useCallback } from 'react'
import type { Participant, Expense } from '@/App'

// Minimal remote synchronization hook (skeleton)
// Responsibilities:
// 1. Fetch trip data (participants + expenses)
// 2. Provide mutation helpers that call backend then update local state
// 3. Expose loading/error states
// NOTE: Auth: caller provides tripSecret for write operations (x-trip-key header)

export interface UseTripRemoteOptions {
  baseUrl?: string // default /api
  tripSlug: string
  tripSecret?: string // required for writes
  // onAuthError?: () => void (future improvement)
}

interface RemoteState {
  participants: Participant[]
  expenses: Expense[]
  loading: boolean
  error: string | null
  refreshing: boolean
}

export function useTripRemote({ tripSlug, tripSecret, baseUrl = '/api' }: UseTripRemoteOptions) {
  const [state, setState] = useState<RemoteState>({ participants: [], expenses: [], loading: true, error: null, refreshing: false })

  const fetchAll = useCallback(async () => {
    setState(s => ({ ...s, refreshing: true }))
    try {
      const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}`)
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
      const data = await res.json()
      setState(s => ({ ...s, participants: data.participants || [], expenses: data.expenses || [], loading: false, error: null, refreshing: false }))
    } catch (e: any) {
      setState(s => ({ ...s, error: e.message || 'error', loading: false, refreshing: false }))
    }
  }, [tripSlug, baseUrl])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Helpers
  async function createParticipant(name: string) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tripSecret ? { 'x-trip-key': tripSecret } : {})
      },
      body: JSON.stringify({ name })
    })
    if (!res.ok) {
      const msg = await safeErr(res)
      if (res.status === 403) throw new Error('Forbidden: invalid or missing trip secret')
      throw new Error(msg)
    }
    const p = await res.json()
    setState(s => ({ ...s, participants: [...s.participants, p] }))
    return p
  }

  async function deleteParticipant(id: string) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/participants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...(tripSecret ? { 'x-trip-key': tripSecret } : {}) }
    })
    if (res.status === 204) {
      setState(s => ({ ...s, participants: s.participants.filter(p => p.id !== id), expenses: s.expenses.filter(e => !e.participants.includes(id) && e.paidBy !== id) }))
      return
    }
    throw new Error(await safeErr(res))
  }

  async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tripSecret ? { 'x-trip-key': tripSecret } : {})
      },
      body: JSON.stringify({
        amount: expense.amount,
        date: expense.date,
        place: expense.place,
        description: expense.description,
        paidBy: expense.paidBy,
        participants: expense.participants
      })
    })
    if (!res.ok) {
      const msg = await safeErr(res)
      if (res.status === 403) throw new Error('Forbidden: invalid or missing trip secret')
      throw new Error(msg)
    }
    const e = await res.json()
    setState(s => ({ ...s, expenses: [...s.expenses, e] }))
    return e as Expense
  }

  async function updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(tripSecret ? { 'x-trip-key': tripSecret } : {})
      },
      body: JSON.stringify(patch)
    })
    if (!res.ok) {
      const msg = await safeErr(res)
      if (res.status === 403) throw new Error('Forbidden: invalid or missing trip secret')
      throw new Error(msg)
    }
    const updated = await res.json()
    setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, ...updated } : e) }))
    return updated as Expense
  }

  async function deleteExpense(id: string) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...(tripSecret ? { 'x-trip-key': tripSecret } : {}) }
    })
    if (res.status === 204) {
      setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }))
      return
    }
    if (res.status === 403) throw new Error('Forbidden: invalid or missing trip secret')
    throw new Error(await safeErr(res))
  }

  return {
    ...state,
    refresh: fetchAll,
    createParticipant,
    deleteParticipant,
    createExpense,
    updateExpense,
    deleteExpense
  }
}

async function safeErr(res: Response) {
  try { const j = await res.json(); return j.error || JSON.stringify(j) } catch { return res.statusText }
}

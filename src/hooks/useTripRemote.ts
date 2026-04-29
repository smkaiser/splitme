import { useEffect, useState, useCallback } from 'react'
import type { Participant, Expense, Contributor } from '@/types'
import { getErrorMessage } from '@/lib/errors'

// Minimal remote synchronization hook (skeleton)
// Responsibilities:
// 1. Fetch trip data (participants + expenses)
// 2. Provide mutation helpers that call backend then update local state
// 3. Expose loading/error states

export interface UseTripRemoteOptions {
  baseUrl?: string // default /api
  tripSlug: string
}

interface RemoteState {
  participants: Participant[]
  expenses: Expense[]
  contributors: Contributor[]
  loading: boolean
  error: string | null
  refreshing: boolean
  locked: boolean
  ownerId: string | null
  ownerName: string | null
  ownerProvider: string | null
  tripName: string | null
  isContributor: boolean
  photoUpdatedAt: string | null
}

export function useTripRemote({ tripSlug, baseUrl = '/api' }: UseTripRemoteOptions) {
  const [state, setState] = useState<RemoteState>({
    participants: [],
    expenses: [],
    contributors: [],
    loading: true,
    error: null,
    refreshing: false,
    locked: false,
    ownerId: null,
    ownerName: null,
    ownerProvider: null,
    tripName: null,
    isContributor: false,
    photoUpdatedAt: null
  })

  const fetchAll = useCallback(async () => {
    setState(s => ({ ...s, refreshing: true }))
    try {
  const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
      const data = await res.json()
      setState(s => ({
        ...s,
        participants: data.participants || [],
        expenses: data.expenses || [],
        contributors: data.contributors || [],
        loading: false,
        error: null,
        refreshing: false,
        locked: Boolean(data.locked),
        ownerId: data.ownerId ?? null,
        ownerName: data.ownerName ?? null,
        ownerProvider: data.ownerProvider ?? null,
        tripName: data.name ?? s.tripName,
        isContributor: Boolean(data.isContributor),
        photoUpdatedAt: data.photoUpdatedAt ?? null
      }))
    } catch (e: any) {
      setState(s => ({ ...s, error: e.message || 'error', loading: false, refreshing: false }))
    }
  }, [tripSlug, baseUrl])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Helpers
  async function createParticipant(name: string) {
    if (state.locked) throw new Error('Trip is locked. Unlock to make changes.')
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const p = await res.json()
    setState(s => ({ ...s, participants: [...s.participants, p] }))
    return p
  }

  async function deleteParticipant(id: string) {
    if (state.locked) throw new Error('Trip is locked. Unlock to make changes.')
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/participants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status === 204) {
      setState(s => ({ ...s, participants: s.participants.filter(p => p.id !== id), expenses: s.expenses.filter(e => !e.participants.includes(id) && e.paidBy !== id) }))
      return
    }
    throw new Error(await getErrorMessage(res))
  }

  async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
    if (state.locked) throw new Error('Trip is locked. Unlock to make changes.')
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: expense.amount,
        date: expense.date,
        place: expense.place,
        description: expense.description,
        paidBy: expense.paidBy,
        participants: expense.participants
      }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const e = await res.json()
    setState(s => ({ ...s, expenses: [...s.expenses, e] }))
    return e as Expense
  }

  async function updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
    if (state.locked) throw new Error('Trip is locked. Unlock to make changes.')
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const updated = await res.json()
    setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, ...updated } : e) }))
    return updated as Expense
  }

  async function deleteExpense(id: string) {
    if (state.locked) throw new Error('Trip is locked. Unlock to make changes.')
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status === 204) {
      setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }))
      return
    }
    throw new Error(await getErrorMessage(res))
  }

  async function toggleLock(nextLocked: boolean) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: nextLocked }),
      credentials: 'include'
    })
    if (res.status === 403) {
      throw new Error('Only the trip owner can change the lock state')
    }
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const data = await res.json()
    setState(s => ({ ...s, locked: Boolean(data.locked), refreshing: false }))
    return Boolean(data.locked)
  }

  async function joinTrip(linkedParticipantId?: string | null) {
    const body: Record<string, unknown> = {}
    if (linkedParticipantId) body.linkedParticipantId = linkedParticipantId
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/contributors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const contributor = await res.json()
    setState(s => ({
      ...s,
      contributors: s.contributors.some(c => c.userId === contributor.userId)
        ? s.contributors
        : [...s.contributors, contributor],
      isContributor: true
    }))
    return contributor
  }

  async function leaveTrip() {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/contributors`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status !== 204 && !res.ok) throw new Error(await getErrorMessage(res))
    setState(s => ({ ...s, isContributor: false }))
    // Re-fetch to get accurate contributors list
    await fetchAll()
  }

  async function linkParticipant(linkedParticipantId: string | null) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/contributors`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedParticipantId }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const updated = await res.json()
    setState(s => ({
      ...s,
      contributors: s.contributors.map(c =>
        c.userId === updated.userId ? { ...c, linkedParticipantId: updated.linkedParticipantId } : c
      )
    }))
    return updated
  }

  async function setPhoto(file: File) {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        const idx = result.indexOf(',')
        resolve(idx >= 0 ? result.slice(idx + 1) : result)
      }
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/photo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type, dataBase64 }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(await getErrorMessage(res))
    const data = await res.json()
    setState(s => ({ ...s, photoUpdatedAt: data.photoUpdatedAt || null }))
    return data
  }

  async function removePhoto() {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(tripSlug)}/photo`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status !== 204 && !res.ok) throw new Error(await getErrorMessage(res))
    setState(s => ({ ...s, photoUpdatedAt: null }))
  }

  return {
    ...state,
    refresh: fetchAll,
    createParticipant,
    deleteParticipant,
    createExpense,
    updateExpense,
    deleteExpense,
    toggleLock,
    joinTrip,
    leaveTrip,
    linkParticipant,
    setPhoto,
    removePhoto
  }
}

import { useEffect, useState, useCallback } from 'react'
import { Trip } from '@/types'

interface UseTripsRemoteOptions {
  baseUrl?: string
}

interface TripsState {
  trips: Trip[]
  loading: boolean
  error: string | null
  creating: boolean
  requiresAuth: boolean
}

export function useTripsRemote({ baseUrl = '/api' }: UseTripsRemoteOptions = {}) {
  const [state, setState] = useState<TripsState>({ trips: [], loading: true, error: null, creating: false, requiresAuth: false })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
  const res = await fetch(`${baseUrl}/trips`, { credentials: 'include' })
      if (res.status === 401) {
        setState(s => ({ ...s, loading: false, trips: [], requiresAuth: true, error: null }))
        return
      }
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      const trips: Trip[] = (data.trips || []).map((t: any) => ({
        id: t.tripId ?? t.id,
        name: t.name,
        slug: t.slug,
        createdAt: t.createdAt,
        ownerId: t.ownerId ?? null,
        ownerName: t.ownerName ?? null,
        ownerProvider: t.ownerProvider ?? null
      }))
      setState(s => ({ ...s, trips, loading: false, error: null, requiresAuth: false }))
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message || 'error', requiresAuth: false }))
    }
  }, [baseUrl])

  useEffect(() => { load() }, [load])

  async function createTrip(name: string) {
    setState(s => ({ ...s, creating: true }))
    try {
      const res = await fetch(`${baseUrl}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include'
      })
      if (res.status === 401) {
        setState(s => ({ ...s, creating: false, requiresAuth: true }))
        throw new Error('Authentication required to create trips')
      }
      if (!res.ok) throw new Error(await errText(res))
  const data = await res.json()
  const newTrip: Trip = {
    id: data.tripId,
    name: data.name,
    slug: data.slug,
    createdAt: data.createdAt,
    ownerId: data.ownerId ?? null,
    ownerName: data.ownerName ?? null,
    ownerProvider: data.ownerProvider ?? null
  }
  setState(s => ({ ...s, trips: [newTrip, ...s.trips], creating: false, requiresAuth: false }))
  return { trip: newTrip }
    } catch (e: any) {
      setState(s => ({ ...s, creating: false, error: e.message || 'create failed' }))
      throw e
    }
  }

  async function deleteTrip(slug: string) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.status === 401) {
      setState(s => ({ ...s, requiresAuth: true }))
      throw new Error('Authentication required to delete trips')
    }
    if (res.status === 403) {
      throw new Error('You do not have permission to delete this trip')
    }
    if (res.status === 204) {
      setState(s => ({ ...s, trips: s.trips.filter(t => t.slug !== slug) }))
      return
    }
    throw new Error(await errText(res))
  }

  return { ...state, refresh: load, createTrip, deleteTrip }
}

async function errText(res: Response) {
  try { const j = await res.json(); return j.error || JSON.stringify(j) } catch { return res.statusText }
}
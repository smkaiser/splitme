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
}

export function useTripsRemote({ baseUrl = '/api' }: UseTripsRemoteOptions = {}) {
  const [state, setState] = useState<TripsState>({ trips: [], loading: true, error: null, creating: false })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      const res = await fetch(`${baseUrl}/trips`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setState(s => ({ ...s, trips: data.trips || [], loading: false, error: null }))
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message || 'error' }))
    }
  }, [baseUrl])

  useEffect(() => { load() }, [load])

  async function createTrip(name: string) {
    setState(s => ({ ...s, creating: true }))
    try {
      const res = await fetch(`${baseUrl}/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      if (!res.ok) throw new Error(await errText(res))
  const data = await res.json()
  const newTrip: Trip = { id: data.tripId, name: data.name, slug: data.slug, createdAt: data.createdAt }
  setState(s => ({ ...s, trips: [newTrip, ...s.trips], creating: false }))
  return { trip: newTrip }
    } catch (e: any) {
      setState(s => ({ ...s, creating: false, error: e.message || 'create failed' }))
      throw e
    }
  }

  async function deleteTrip(slug: string) {
    const res = await fetch(`${baseUrl}/trips/${encodeURIComponent(slug)}`, { method: 'DELETE' })
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
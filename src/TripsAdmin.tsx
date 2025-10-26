import { useMemo, useState } from 'react'
import { Trip } from './types'
import { useTripsRemote } from './hooks/useTripsRemote'
import { AUTH_PROVIDERS, useAuth } from './hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash, Plus } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

export function TripsAdmin() {
  const { trips, loading, error: loadError, createTrip, deleteTrip, creating, requiresAuth } = useTripsRemote()
  const { user, loading: authLoading, error: authError, login, logout } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joinSlug, setJoinSlug] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  const sortedTrips = useMemo(() => {
    return (trips || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [trips])

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Trip name required')
      return
    }
    if (!user) {
      setError('Sign in to create trips')
      return
    }
    try {
      await createTrip(trimmed)
      setError(null)
      setName('')
    } catch (e: any) {
      setError(e.message || 'Failed to create trip')
    }
  }

  const handleDelete = async (trip: Trip) => {
    if (!confirm(`Delete trip "${trip.name}"? This will remove all its data.`)) return
    try {
      await deleteTrip(trip.slug)
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const handleJoin = () => {
    const raw = joinSlug.trim()
    if (!raw) {
      setJoinError('Enter a trip ID or slug')
      return
    }
    const normalized = raw
      .replace(/^https?:\/\/[^/]+\/t\//i, '')
      .replace(/^t\//i, '')
      .replace(/\/$/, '')
    if (!normalized) {
      setJoinError('Enter a valid trip slug')
      return
    }
    window.location.href = `/t/${encodeURIComponent(normalized)}`
  }

  const providerButtons = AUTH_PROVIDERS.map(provider => (
    <Button
      key={provider.id}
      variant="outline"
      className="justify-start"
      onClick={() => login(provider.id, window.location.href)}
    >
      Continue with {provider.label}
    </Button>
  ))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trips Admin</h1>
          {!user && requiresAuth && (
            <p className="text-sm text-muted-foreground mt-2">Sign in to create or manage trips.</p>
          )}
          {authError && <p className="text-destructive text-sm mt-2">{authError}</p>}
          {loadError && !requiresAuth && (
            <p className="text-destructive text-sm mt-2">{loadError}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Join a Trip</CardTitle>
              <CardDescription>Enter a trip ID or slug to jump straight in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Trip slug (e.g. italy-2025)"
                value={joinSlug}
                onChange={e => { setJoinSlug(e.target.value); setJoinError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
              />
              <Button onClick={handleJoin}>Open Trip</Button>
              {joinError && <p className="text-destructive text-xs">{joinError}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{user ? 'Account' : 'Sign in'}</CardTitle>
              <CardDescription>
                {user ? `Signed in as ${user.name}` : 'Use a social or work identity to manage your trips.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-muted-foreground">
                    {user.email ? <div>{user.email}</div> : null}
                    <div>Provider: {user.provider}</div>
                  </div>
                  <Button variant="outline" onClick={() => logout(window.location.href)}>Sign out</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {authLoading && <p className="text-sm text-muted-foreground">Checking session…</p>}
                  {providerButtons}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>New Trip</CardTitle>
            <CardDescription>Add a new trip to start tracking expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="e.g. Italy 2025"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                disabled={!user}
              />
              <Button onClick={handleAdd} className="md:w-auto" disabled={creating || !user}>
                <Plus className="w-4 h-4 mr-2" />
                {creating ? 'Creating...' : user ? 'Add Trip' : 'Sign in required'}
              </Button>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
            {!user && !authLoading && (
              <p className="text-sm text-muted-foreground mt-2">Sign in above to create new trips.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {requiresAuth && !user && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Sign in to see and manage your trips.
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading trips...</CardContent>
            </Card>
          )}

          {!loading && (!requiresAuth || !!user) && sortedTrips.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No trips yet. Create your first trip above.
              </CardContent>
            </Card>
          )}

          {sortedTrips.map(trip => (
            <Card key={trip.id} className="group">
              <CardContent className="py-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{trip.name}</h3>
                    {trip.locked && (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(trip.createdAt).toLocaleDateString()} • URL /t/{trip.slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { window.location.href = `/t/${trip.slug}` }}>Open</Button>
                  <Button variant="destructive" onClick={() => handleDelete(trip)} disabled={!user}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

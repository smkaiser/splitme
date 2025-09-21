import { useState } from 'react'
import { Trip } from './types'
import { useTripsRemote } from './hooks/useTripsRemote'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Trash, Plus } from '@phosphor-icons/react'

export function TripsAdmin() {
  const { trips, loading, error: loadError, createTrip, deleteTrip, creating } = useTripsRemote()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Trip name required')
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
    try { await deleteTrip(trip.slug) } catch (e: any) { setError(e.message || 'Delete failed') }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trips Admin</h1>
          {loadError && <p className="text-destructive text-sm mt-2">{loadError}</p>}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>New Trip</CardTitle>
            <CardDescription>Add a new trip to start tracking expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="e.g. Italy 2025"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              />
              <Button onClick={handleAdd} className="md:w-auto" disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                {creating ? 'Creating...' : 'Add Trip'}
              </Button>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(trips || []).length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No trips yet. Create your first trip above.</CardContent>
            </Card>
          )}
          {loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Loading trips...</CardContent>
            </Card>
          )}
          {(trips || [])
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(trip => (
              <Card key={trip.id} className="group">
                <CardContent className="py-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{trip.name}</h3>
                    <p className="text-sm text-muted-foreground">Created {new Date(trip.createdAt).toLocaleDateString()} • URL /t/{trip.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { window.location.href = `/t/${trip.slug}` }}>Open</Button>
                    <Button variant="destructive" onClick={() => handleDelete(trip)}>
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

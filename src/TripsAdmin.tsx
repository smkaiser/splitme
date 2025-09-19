import { useState } from 'react'
import { useKV } from './hooks/useKV'
import { v4 as uuidv4 } from 'uuid'
import { Trip } from './types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Trash, Plus } from '@phosphor-icons/react'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function TripsAdmin() {
  const [trips, setTrips] = useKV<Trip[]>('trips', [])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Trip name required')
      return
    }
    const slugBase = slugify(trimmed)
    let slug = slugBase
    let i = 1
    while ((trips || []).some(t => t.slug === slug)) {
      slug = `${slugBase}-${i++}`
    }
    const newTrip: Trip = { id: uuidv4(), name: trimmed, slug, createdAt: new Date().toISOString() }
    setTrips([...(trips || []), newTrip])
    setName('')
    setError(null)
  }

  const handleDelete = (trip: Trip) => {
    if (!confirm(`Delete trip "${trip.name}"? This will remove all its data.`)) return
    // Remove trip
    setTrips((trips || []).filter(t => t.id !== trip.id))
    // Cleanup namespaced keys
    try {
      localStorage.removeItem(`participants:${trip.slug}`)
      localStorage.removeItem(`expenses:${trip.slug}`)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trips Admin</h1>
          <p className="text-muted-foreground">Create and manage multiple trips</p>
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
              <Button onClick={handleAdd} className="md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Trip
              </Button>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(trips || []).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No trips yet. Create your first trip above.</CardContent>
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

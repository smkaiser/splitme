import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTripsRemote } from '@/hooks/useTripsRemote'
import { UserMenu } from '@/components/UserMenu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'


export function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trips, loading: tripsLoading } = useTripsRemote()
  const [tripId, setTripId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sortedTrips = useMemo(() => {
    return (trips || [])
      .filter(t => !t.locked || t.role === 'contributor')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [trips])

  const handleJoin = () => {
    const raw = tripId.trim()
    if (!raw) {
      setError('Enter a trip ID')
      return
    }
    const normalized = raw
      .replace(/^https?:\/\/[^/]+\/t\//i, '')
      .replace(/^t\//i, '')
      .replace(/\/$/, '')
    if (!normalized) {
      setError('Enter a valid trip ID')
      return
    }
    navigate(`/t/${encodeURIComponent(normalized)}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex justify-end mb-4">
          <UserMenu />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">SplitMe</h1>
          <p className="text-xl text-muted-foreground">
            Split expenses with friends. No hassle, no math.
          </p>
        </div>

        {user && sortedTrips.length > 0 && (
          <div className="mb-8 space-y-3">
            <h2 className="text-lg font-semibold">Your Trips</h2>
            {sortedTrips.map(trip => (
              <Card
                key={trip.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/t/${trip.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/t/${trip.slug}`)
                  }
                }}
                className="group cursor-pointer transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="py-4 flex items-center gap-4">
                  {trip.photoUpdatedAt && (
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                      <img
                        src={`/api/trips/${encodeURIComponent(trip.slug)}/photo?v=${encodeURIComponent(trip.photoUpdatedAt)}`}
                        alt={`${trip.name} photo`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{trip.name}</span>
                      {trip.role === 'contributor' && (
                        <Badge variant="outline" className="text-xs">Contributor</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/t/${trip.slug}`)}>
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="text-right">
              <Button variant="link" asChild size="sm">
                <Link to="/trips">Manage all trips →</Link>
              </Button>
            </div>
          </div>
        )}

        {user && tripsLoading && (
          <p className="text-sm text-muted-foreground text-center mb-8">Loading your trips…</p>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Join a Trip</CardTitle>
            <CardDescription>
              Have a trip link or ID? Enter it below to jump in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                className="flex-1"
                placeholder="Trip ID or link (e.g. italy-2025)"
                value={tripId}
                onChange={e => { setTripId(e.target.value); setError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
              />
              <Button onClick={handleJoin}>Open Trip</Button>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </CardContent>
        </Card>

        <div className="text-center">
          {user ? (
            <Button asChild size="lg">
              <Link to="/trips">Manage Your Trips</Link>
            </Button>
          ) : (
            <p className="text-muted-foreground">
              <Link to="/trips" className="underline hover:no-underline">Sign in</Link> to create and manage trips.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

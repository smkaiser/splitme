import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { TripsAdmin } from './TripsAdmin'
import { Trip } from './types'
import { useEffect, useState } from 'react'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

function RootRouter() {
  // Basic client-side routing using location pathname
  const path = window.location.pathname
  if (path === '/' || path === '') {
    return <TripsAdmin />
  }
  const tripMatch = path.match(/^\/t\/([^/]+)\/?$/)
  if (tripMatch) {
    const slug = tripMatch[1]
    return <RemoteTripLoader slug={slug} />
  }
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <button className="underline" onClick={() => { window.location.href='/' }}>Home</button>
    </div>
  )
}

function RemoteTripLoader({ slug }: { slug: string }) {
  const [trip, setTrip] = useState<{ name: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'notfound' | 'error' | 'ready'>('loading')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(slug)}`)
        if (res.status === 404) { if (!cancelled) setStatus('notfound'); return }
        if (!res.ok) { if (!cancelled) setStatus('error'); return }
        const data = await res.json()
        if (!cancelled) { setTrip({ name: data.name }); setStatus('ready') }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-xl font-semibold">Loading trip...</h1>
        <p className="text-muted-foreground text-sm">Fetching trip data</p>
      </div>
    )
  }
  if (status === 'notfound') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Trip Not Found</h1>
        <p className="text-muted-foreground">No trip exists for slug "{slug}"</p>
        <button className="underline" onClick={() => { window.location.href='/' }}>Back to Trips</button>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">Could not load trip. Try again.</p>
        <div className="flex gap-2">
          <button className="underline" onClick={() => { window.location.reload() }}>Retry</button>
          <button className="underline" onClick={() => { window.location.href='/' }}>Trips</button>
        </div>
      </div>
    )
  }
  return <App tripSlug={slug} tripName={trip?.name} />
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <RootRouter />
   </ErrorBoundary>
)

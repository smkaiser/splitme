import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { TripsAdmin } from './TripsAdmin'
import { Trip } from './types'
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
    // Read trips from localStorage directly (outside hook context) to get the name
    let trips: Trip[] = []
    try {
      const raw = localStorage.getItem('trips')
      if (raw) trips = JSON.parse(raw)
    } catch {}
    const trip = trips.find(t => t.slug === slug)
    if (!trip) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold">Trip Not Found</h1>
          <p className="text-muted-foreground">No trip exists for slug "{slug}"</p>
          <button className="underline" onClick={() => { window.location.href='/' }}>Back to Trips</button>
        </div>
      )
    }
    return <App tripSlug={slug} tripName={trip.name} />
  }
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <button className="underline" onClick={() => { window.location.href='/' }}>Home</button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <RootRouter />
   </ErrorBoundary>
)

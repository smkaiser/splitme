import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom'

import App from './App.tsx'
import { TripsAdmin } from './TripsAdmin'
import { useEffect, useState } from 'react'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link className="underline" to="/">Home</Link>
    </div>
  )
}

function RemoteTripLoader() {
  const { slug } = useParams<{ slug: string }>()
  const [trip, setTrip] = useState<{ name: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'notfound' | 'error' | 'ready'>('loading')
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
  const res = await fetch(`/api/trips/${encodeURIComponent(slug)}`, { credentials: 'include' })
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

  if (!slug) return <NotFound />

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
        <Link className="underline" to="/">Back to Trips</Link>
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
          <Link className="underline" to="/">Trips</Link>
        </div>
      </div>
    )
  }
  return <App tripSlug={slug} tripName={trip?.name} />
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripsAdmin />} />
        <Route path="/t/:slug" element={<RemoteTripLoader />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
)
